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
 *
 * 【重要：検査を足したら、必ず「わざと壊して」確かめること（INC-058）】
 * 書いただけの検査は働いていないことがある（実績：12件中3件が偽陰性だった）。
 * 「名前が文字列として存在するか」ではなく「実際に使われているか」を見ること。
 * 対応する scripts/guard-selftest.template.sh に、壊し方を1行必ず足す（後回し禁止）。
 * 検査が0件を返したら「本当に問題無し」か「対象を1件も見ていない」かを区別すること。
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
    /*
     * 【このアプリ向けに書き換え済み】元テンプレートは複数モデルへの再試行がある構成
     * （GEMINI_PER_MODEL_TIMEOUT_MS × SAME_MODEL_RETRIES）を前提にしていたが、
     * このアプリは単一モデル・再試行なしの1回呼び出しのため、
     * GEMINI_TIMEOUT_MS と、それを呼ぶAPIルートの maxDuration の関係だけを見る。
     */
    id: 'INC-051',
    title: 'Geminiの呼び出しタイムアウトが、APIルートの実行時間上限に収まっているか',
    why: 'timeoutがmaxDurationを超えたまま関数がキルされると、投稿がpendingのまま固まり理由も残らない',
    run() {
      const g = read('src/lib/gemini.ts');
      const m = g.match(/GEMINI_TIMEOUT_MS\s*=\s*(\d+)/);
      if (!m) return [{ file: 'src/lib/gemini.ts', msg: 'GEMINI_TIMEOUT_MS が見つからない' }];
      const geminiTimeoutMs = Number(m[1]);
      const bad = [];
      for (const f of FILES.filter(
        (f) => /app\/api\/.*route\.ts$/.test(f.rel) && /from ['"]@\/lib\/(gemini|ingest)['"]/.test(f.text)
      )) {
        const dm = f.text.match(/maxDuration\s*=\s*(\d+)/);
        if (!dm) {
          bad.push({ file: f.rel, msg: 'Geminiを呼ぶのに maxDuration が設定されていない' });
          continue;
        }
        const limitMs = Number(dm[1]) * 1000;
        if (geminiTimeoutMs >= limitMs) {
          bad.push({ file: f.rel, msg: `GEMINI_TIMEOUT_MS(${geminiTimeoutMs}ms) が maxDuration(${limitMs}ms) 以上。画像アップロード等の余裕がない` });
        } else if (limitMs - geminiTimeoutMs < 5000) {
          bad.push({ file: f.rel, msg: `GEMINI_TIMEOUT_MS と maxDuration の差が5秒未満。DB書き込み等の余裕がない` });
        }
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
        /*
         * 【INC-058で見逃した】import が残っているだけでは意味がない。
         * 「呼んでいるか」＝ かっこ付きで使われているかを見る（名前があるだけで合格させない）。
         */
        .filter((f) => !/isImeComposing\s*\(|\.isComposing\b/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'isImeComposing(e) を入れること' }));
    },
  },
  /*
   * 【INC-031改訂】Vercel Hobbyプランでは本番ドメイン自体をVercel Authenticationで
   * 保護できないと判明したため（実際に第三者アクセス可能な状態で発覚）、
   * src/proxy.tsでBasic認証をかける方式に変更した。BASIC_AUTH_PASSWORD未設定時は
   * 無防備になるため、本番環境変数の設定を絶対に忘れないこと。
   */
  {
    /*
     * 【このアプリ向けに書き換え済み】元テンプレートは fetch ベースの db.ts を前提にしていたが、
     * このアプリは @neondatabase/serverless（Neon/Postgres）を直接使う。
     * Next.js App Router の Route Handler は dynamic='force-dynamic' を宣言しないと
     * 結果がキャッシュされうるため、そちらを見る。
     */
    id: 'INC-008',
    title: 'APIルートがキャッシュされない設定になっているか',
    why: "dynamic='force-dynamic' が無いと、更新したのに古い値が返り続ける場合がある",
    run() {
      return FILES
        .filter((f) => /app\/api\/.*route\.ts$/.test(f.rel))
        .filter((f) => !/dynamic\s*=\s*['"]force-dynamic['"]/.test(f.text))
        .map((f) => ({ file: f.rel, msg: "export const dynamic = 'force-dynamic' を追加すること" }));
    },
  },
  /*
   * 【INC-070を検査化せず断念】Neonドライバがdate型カラムをJSのDateとして返し、
   * JSON化するとタイムゾーンでずれた日時文字列になる問題（実データのE2E確認で発見・修正済み）。
   * 「posted_dateという文字列が::textキャスト無しで現れないか」を素朴な行単位の正規表現で
   * 試したが、TypeScriptの型宣言・INSERT列名・JS変数名など無関係な行まで誤検知し、
   * わざと壊して確かめる前の時点で既に偽陽性だらけだった（INC-058の教訓通り）。
   * SQL文脈だけを正しく判定するには簡易な正規表現では不十分なため、検査化を見送り、
   * インシデント記録と POST_COLUMNS（src/lib/ingest.ts）による一元化に留める。
   */
  {
    id: 'INC-033',
    title: 'サーバー側で、その場の日付を使っていないか',
    why: '日本時間0〜9時に日付が1日ずれる。深夜に使うと学習記録が前日に入る',
    run() {
      // API ルートだけでなく lib も見る（サーバー側で動く日付処理はどちらにもあるため）
      return FILES
        .filter((f) => /app\/api\/.*route\.ts$/.test(f.rel) || /lib\/.*\.ts$/.test(f.rel))
        .filter((f) => !/\.test\.ts$/.test(f.rel))
        .filter((f) => /\.toISOString\(\)\.(slice|substring)\(0,\s*10\)/.test(f.text))
        .map((f) => ({ file: f.rel, msg: 'toDayKeyInZone() を使うこと' }));
    },
  },
  /*
   * 【INC-035を除外】このアプリは2026-09-01、ユーザーの明示的な指示によりBasic認証を
   * 完全に撤廃し、本番URLを知っていれば誰でも認証なしでアクセスできる仕様に変更した
   * （src/proxy.ts を削除）。この検査は「proxy.tsが無いと意図せず認証が素通りになる」
   * ことを防ぐためのものだが、今は無いこと自体が意図した状態なので対象外にする。
   * 将来また保護が必要になったら、この除外を外してproxy.tsを復活させること。
   */
  /*
   * 【INC-026を除外】このアプリはテーブル定義をTypeScriptのschema.tsではなく
   * db/migrations/*.sql で管理し、データの実体はNeon（マネージドPostgres）が持つ。
   * 独自の控え（backup.ts）は持たない。Neonプロジェクト側のバックアップ設定
   * （ブランチ機能・PITR等）は要件外として対象外にしている。将来必要になったら
   * ここに実装し、検査を追加すること。
   */

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

  {
    /*
     * 【INC-069】このフォルダは「アプリ作成原本」をcreate_new_app.pyを使わず直接複製して
     * 作られたため、.gitごとコピーされ origin が複製元（共有テンプレート配布用リポジトリ）を
     * 指したまま残っていた。気づかずリモート省略でpushすると、このアプリのコードが
     * 共有テンプレート側へ誤って送られる恐れがある。
     */
    id: 'INC-069',
    title: 'gitのoriginが共有テンプレート配布用リポジトリを指したままになっていないか',
    why: 'リモート省略でpushすると、このアプリのコードが共有テンプレート側へ誤って送られる',
    run() {
      const REAL_TEMPLATE_PATH = '/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本';
      if (ROOT.replace(/\/$/, '') === REAL_TEMPLATE_PATH) return []; // 本物の原本では当然originはこれでよい

      let remotes = '';
      try {
        remotes = execSync('git remote -v', { cwd: ROOT, encoding: 'utf8' });
      } catch {
        return []; // gitが使えない環境では判定不能（何もFILESが無い時と同じ扱い）
      }
      const originLine = remotes.split('\n').find((l) => l.startsWith('origin\t') && l.includes('(push)'));
      if (!originLine) return [];
      if (/app-template\d*\.git/.test(originLine)) {
        return [{ file: '(git remote)', msg: `origin(push)が共有テンプレート配布用を指しています: ${originLine.trim()}。デプロイ用の別リモートを追加し、そちらへpushすること` }];
      }
      return [];
    },
  },
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
