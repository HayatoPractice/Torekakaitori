/**
 * guard.mjs — 過去のインシデントの再発を、機械が見張る（全アプリ共通の雛形）
 *
 * 【なぜこれが要るか】
 * インシデントは54件・16万字あり、事前チェックリストは117項目ある。
 * 人間もAIも、毎回これを読んでから作業することはできない。
 * 実際、記録したあとに再発した事例が複数ある（INC-026・INC-030・INC-016）。
 *
 * 「覚えておく」で守れるルールは守られない。
 * **検査に落とせるものは検査にする**、というのがこのファイルの役目。
 *
 * 【使い方】
 *   npm run guard        変更のたびに実行する（lint / test と同じ扱い）
 *
 * 【足し方】
 * 新しいインシデントを記録したら「これは機械で検査できるか」を必ず考え、
 * できるなら CHECKS に1件足す。できないなら _PRE_CHECKLIST.md に書く。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// パスに日本語が含まれると URL.pathname は%エンコードされるため、必ず変換して使う
const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** ソースを置いているフォルダ。アプリに合わせて変えること（src / app / frontend/src など） */
const SRC = join(ROOT, 'src');

/** src配下のファイルを列挙する */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map((p) => ({ path: p, rel: relative(ROOT, p), text: readFileSync(p, 'utf8') }));

/*
 * 【安全装置】ソースが1つも見つからないなら、検査は必ず全部「合格」する。
 * これは最も危険な状態で、**守られていないのに守られているように見える**。
 * 置き場所を間違えたコピーを黙って通さないよう、ここで止める。
 * この処理は削らないこと。
 */
if (FILES.length === 0) {
  console.error(`\n  検査するファイルが1つも見つかりません: ${SRC}`);
  console.error('  guard.mjs の SRC を、このアプリのソースの置き場所に合わせてください。');
  console.error('  （そのままでは全項目が空振りで合格し、守られていないのに守られて見えます）\n');
  process.exit(1);
}
const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : '');

/** 各検査は { id, title, why, run() } を返す。run は違反の配列を返す。 */
const CHECKS = [
  {
    id: 'INC-051',
    title: '外部AIの待ち時間が、実行時間の上限を超えないか',
    why: '1回あたりの上限 × 切り替え先の本数 × 再試行回数 が上限を超えると、必ず切断される',
    run() {
      const g = read('src/lib/gemini.ts');
      const num = (name) => Number((g.match(new RegExp(name + '\\s*=\\s*(\\d+)')) || [])[1]);
      const per = num('GEMINI_PER_MODEL_TIMEOUT_MS');
      const retries = num('SAME_MODEL_RETRIES');
      const budget = num('TOTAL_BUDGET_MS');
      const bad = [];
      if (!per || !budget) return [{ msg: 'gemini.ts から待ち時間の設定を読み取れない' }];

      // 全体の締め切りが、実際の実行時間の上限より内側にあること
      for (const f of FILES.filter((f) => /app\/api\/.*route\.ts$/.test(f.rel))) {
        const m = f.text.match(/maxDuration\s*=\s*(\d+)/);
        if (!m) continue;
        const limit = Number(m[1]) * 1000;
        if (budget >= limit) {
          bad.push({ file: f.rel, msg: `全体の締め切り ${budget}ms が実行時間の上限 ${limit}ms 以上。切断されてHTMLが返る` });
        }
      }
      // 1本ぶんの最悪値が、締め切りに収まること（収まらないと途中で必ず打ち切られる）
      const worstOne = per * (retries + 1);
      if (worstOne > budget) {
        bad.push({ file: 'src/lib/gemini.ts', msg: `1モデルの最悪値 ${worstOne}ms が全体の締め切り ${budget}ms を超える` });
      }
      return bad;
    },
  },
  {
    id: 'INC-052',
    title: '画面が res.json() を直接呼んでいないか',
    why: '処理が切られるとHTMLが返り、「is not valid JSON」という暗号が利用者に表示される',
    run() {
      return FILES
        .filter((f) => !/app\/api\//.test(f.rel) && !/lib\/api-client\.ts$/.test(f.rel) && !/scripts\//.test(f.rel))
        .filter((f) => /\bres(ponse)?\.json\(\)/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'readJson(res) を使うこと' }));
    },
  },
  {
    id: 'INC-053',
    title: 'アンダースコアで始まるフォルダを app 配下に置いていないか',
    why: 'ルーティングから静かに除外される。ビルドは通り、呼ぶと404のHTMLが返る',
    run() {
      const bad = [];
      const scan = (dir) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (!statSync(p).isDirectory()) continue;
          if (name.startsWith('_') && existsSync(join(p, 'route.ts'))) {
            bad.push({ file: relative(ROOT, p), msg: 'この route.ts はURLとして呼べない' });
          }
          scan(p);
        }
      };
      scan(join(SRC, 'app'));
      return bad;
    },
  },
  {
    id: 'INC-009',
    title: 'Enterで送信する入力欄が、日本語の変換中を見ているか',
    why: '見ないと、漢字変換を確定するEnterが送信と誤認される。英語だけのテストでは再現しない',
    run() {
      return FILES
        .filter((f) => /onKeyDown|onKeyPress/.test(f.text) && /['"]Enter['"]/.test(f.text))
        .filter((f) => !/isImeComposing|nativeEvent\.isComposing/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'isImeComposing(e) を入れること' }));
    },
  },
  {
    id: 'INC-031',
    title: '外部AIを呼ぶAPIが、認証を通しているか',
    why: '通さないと、URLを知っている人が誰でも無料枠を焼ける',
    run() {
      return FILES
        .filter((f) => /app\/api\/.*route\.ts$/.test(f.rel))
        .filter((f) => /from '@\/lib\/gemini'|generativelanguage\.googleapis\.com/.test(f.text))
        .filter((f) => !/isRequestAllowed|resolveUserId|getServerSession/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'isRequestAllowed() を通すこと' }));
    },
  },
  {
    id: 'INC-008',
    title: 'DBへの問い合わせがキャッシュされない設定になっているか',
    why: 'Next.jsのfetchキャッシュが効くと、更新したのに古い値が返り続ける',
    run() {
      const db = read('src/lib/db.ts');
      return /no-store/.test(db) ? [] : [{ file: 'src/lib/db.ts', msg: "fetch に cache: 'no-store' が要る" }];
    },
  },
  {
    id: 'INC-033',
    title: 'サーバー側で、その場の日付を使っていないか',
    why: '日本時間0〜9時に日付が1日ずれる。深夜に使うと学習記録が前日に入る',
    run() {
      return FILES
        .filter((f) => /app\/api\/.*route\.ts$/.test(f.rel))
        .filter((f) => /new Date\(\)\.toISOString\(\)\.(slice|substring)\(0,\s*10\)/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'toDayKeyInZone() を使うこと' }));
    },
  },
  {
    id: 'INC-035',
    title: 'proxy.ts が正しい名前で存在するか',
    why: '旧名(middleware.ts)だとビルドは通るが実行時に無視され、認証が全て素通りになる',
    run() {
      const bad = [];
      if (!existsSync(join(SRC, 'proxy.ts')) && !existsSync(join(ROOT, 'proxy.ts'))) {
        bad.push({ file: 'src/proxy.ts', msg: '見つからない。認証が働かない恐れ' });
      }
      if (existsSync(join(SRC, 'middleware.ts'))) {
        bad.push({ file: 'src/middleware.ts', msg: 'Next.js 16 では無視される。proxy.ts に戻すこと' });
      }
      return bad;
    },
  },
  {
    id: 'INC-026',
    title: '控え（バックアップ）が全テーブルを対象にしているか',
    why: '表を足したときに控えへ足し忘れると、失われたことに気づくのは失ってから',
    /*
     * 控えなくてよい表は、ここに「なぜ要らないか」を書いて明示する。
     * 黙って除外すると、次に表を足した人が同じ判断をできない。
     */
    excluded: {
      gemini_ai_logs: 'AI呼び出しの実測記録。失っても学習内容に影響がなく、使ううちに貯まり直す',
      gemini_quality_issues: '点検で見つかった指摘。毎晩の自動点検で作り直される',
    },
    run() {
      const schema = read('src/lib/schema.ts');
      const backup = read('src/app/api/backup/route.ts') + read('src/lib/backup.ts') + read('src/app/api/export/route.ts');
      const tables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/g)].map((m) => m[1]);
      return tables
        .filter((t) => !backup.includes(t) && !(t in this.excluded))
        .map((t) => ({ file: 'src/lib/backup.ts', msg: `表 ${t} が控えの対象に入っていない。控えないなら guard.mjs の excluded に理由を書くこと` }));
    },
  },

  // ────────────────────────────────────────────────────────────────
  // ここから下に、そのアプリ固有の検査を足していく。
  //
  // {
  //   id: 'INC-XXX',
  //   title: '一行で「何を確かめるか」',
  //   why: '守らないと何が起きるか（これが無いと、検査は消される）',
  //   run() {
  //     return FILES.filter(...).map((f) => ({ file: f.rel, msg: 'こう直すこと' }));
  //   },
  // },
  // ────────────────────────────────────────────────────────────────
];

// ── 実行 ──
let ng = 0;
console.log('\n過去のインシデントの再発を検査します（npm run guard）\n');
for (const c of CHECKS) {
  let found;
  try { found = c.run(); } catch (e) { found = [{ msg: `検査自体が失敗: ${e.message}` }]; }
  if (found.length === 0) {
    console.log(`  ✅ ${c.id}  ${c.title}`);
  } else {
    ng += found.length;
    console.log(`  ❌ ${c.id}  ${c.title}`);
    console.log(`      なぜ困るか: ${c.why}`);
    for (const v of found) console.log(`      → ${v.file ? v.file + ' : ' : ''}${v.msg}`);
  }
}
console.log('');
if (ng > 0) {
  console.log(`  ${ng} 件の再発の恐れがあります。詳細は インシデント管理/INCIDENT_INDEX.md を参照してください。\n`);
  process.exit(1);
}
console.log(`  ${CHECKS.length} 件すべて問題ありません。\n`);
