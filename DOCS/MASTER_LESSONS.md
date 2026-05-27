📘 MASTER_LESSONS.md — 全プロジェクト横断マスター教訓集 v1.0（アプリ特化版）
管理者：記録チーム（昇格判断）＋ 秘書（週次確認）
層：🔄 随時更新層（記録チームが昇格判断・追記）
持ち運び：全プロジェクトに必ず投入する（リセット不要・永続的に育てる）

▌変更履歴
バージョン  日付    変更内容                                        変更者
v1.0        初版    ビジネス版から分離・アプリ開発に特化して新規作成  秘書

▌3ファイルの役割の違い
  LEARNING_LOG.md   → プロジェクト内の詳細な記録（何が起きたかの事実）
  CONTEXT_BRIDGE.md → 今のプロジェクトの現在地スナップショット
  MASTER_LESSONS.md → 汎用できると判断した教訓の要約集（知恵の蓄積）

▌このファイルの使い方
  投入：毎回必ず投入する（空欄でもOK）
  反映：参考扱い・採用は社長が判断する
  例外：🟢フィードバックパターンのみ常時適用する

重複について：
  CONTEXT_BRIDGE.mdと内容が重複することがある→正常（矛盾ではない）
  CONTEXT_BRIDGE：プロジェクト固有の詳細文脈
  MASTER_LESSONS：汎用化・抽象化した教訓（粒度が違う）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌昇格ルール（LEARNING_LOG / CONTEXT_BRIDGEからの抽出基準）

記録チームが以下のいずれかに該当すると判断したとき自律的に昇格させる。
昇格の判断は社長確認不要。

昇格させるもの：
  □ 別のプロジェクト・別の技術スタックでも同じ原因で発生しうるミスである
  □ 「この考え方を知っていれば防げた」と言える再現性のある教訓である
  □ AIエージェントが判断を誤りやすいパターンである
  □ 社長から2回以上同じ種類の修正指示が来た内容である
  □ 汎用的な設計・構成の考え方として他プロジェクトでも参照できる
  □ 社長の好み・スタイルに関するフィードバックパターンである
    （社長のスタイルは全プロジェクトで有効なため全て昇格対象）

昇格させないもの：
  □ 特定のアプリ名・API名・固有の数値にしか当てはまらない内容
  □ そのプロジェクトの要件に依存しすぎる判断
  □ 一時的な環境問題で再発しにくいもの

昇格のタイミング：
  → セッション終了時にCONTEXT_BRIDGEを更新するタイミングで同時に確認する
  → 昇格させた場合は元のREC-IDまたはLL-IDを必ず記載する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌記録フォーマット（Few-Shot形式）

<lesson_entry>
【ML-[連番]】[タイトル（1行で教訓を表す）]

登録日：[YYYY-MM-DD]
種別：[ミス防止 / 設計パターン / 判断基準 / エージェント誤作動 / フィードバックパターン]
参照元：[REC-XXX / LL-XXX] / 発生PJ：[アプリ名] / 技術：[Next.js等]

■ 教訓：[一言で抽象化した知恵]

■ 具体例（Few-Shot）:
<bad_pattern>
[失敗したコードや指示の内容]
理由：[なぜこれがダメだったのか、AIがどう誤認したか]
</bad_pattern>

<good_pattern>
[修正後の正解コードや指示の内容]
効果：[どう改善されたか、なぜこれが正解なのか]
</good_pattern>

■ 再発防止策 / 使い方：[次のPJでAIにどう命令すべきか]
■ 適用できる場面：[フェーズ・状況]
</lesson_entry>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌種別ガイド

ミス防止：実装・設計のミス。Before/Afterでコードの差分を示す。
設計パターン：推奨される構造。スケルトンコードを例示する。
判断基準：迷った時の優先順位。判断ロジックをフローで示す。
エージェント誤作動：AIの「クセ」への対策。誤認したプロンプトと修正後のプロンプトを示す。
フィードバックパターン：ユーザーの好み。具体的な「修正指示」とその「反映結果」を示す。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌インデックス（一覧）

| ML-ID  | 種別               | タイトル（一言）  | 発生PJ   | 技術   | 登録日  |
|--------|------------------|----------------|---------|-------|--------|
| ML-001 | ミス防止           | googleToolsは@ai-sdk/google/internalからインポートする    | SNS運用        | @ai-sdk/google v3 | 2026-05-17 |
| ML-002 | ミス防止           | generateTextのmaxStepsパラメータは廃止済み（→stopWhen）   | SNS運用        | AI SDK v3         | 2026-05-17 |
| ML-003 | ミス防止           | googleSearch()は引数オブジェクト{}が必須                  | SNS運用        | @ai-sdk/google v3 | 2026-05-17 |
| ML-004 | 判断基準           | 外部ライブラリはバージョンロックしてREQUIREMENTS_LOGに記録 | SNS運用        | npm全般           | 2026-05-17 |
| ML-005 | フィードバックパターン | TypeScriptエラーは即座に根本解決せよ                   | SNS運用        | TypeScript        | 2026-05-17 |
| ML-006 | ミス防止           | モーダルクローズ前にグローバルIDをローカル変数へ退避せよ    | KYGNUS予約管理 | Vanilla JS        | 2026-05-22 |
| ML-007 | 設計パターン       | 複数非同期が並走するローディング管理はcounter方式を使え    | KYGNUS予約管理 | Vanilla JS        | 2026-05-22 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌教訓本体

🔴 ミス防止
（プロジェクトが進むにつれて蓄積される）

━━━━━━━━━━━━━━━━

🔵 設計パターン

━━━━━━━━━━━━━━━━

🟡 判断基準

━━━━━━━━━━━━━━━━

🟠 エージェント誤作動

━━━━━━━━━━━━━━━━

🟢 フィードバックパターン
（社長の好み・スタイル・繰り返し来る修正指示）
※ このカテゴリは全プロジェクトで常時適用する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌プロジェクト別サマリ

| プロジェクト名         | 登録件数 | 主な種別                              | 登録ML-ID      |
|---------------------|--------|-------------------------------------|--------------|
| SNS運用プロジェクト   | 5件    | ミス防止・判断基準・フィードバックパターン | ML-001〜ML-005 |
| KYGNUS予約管理        | 2件    | ミス防止・設計パターン                  | ML-006〜ML-007 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌セッション開始時の活用ルール

STEP 1｜このファイルを読み込む（毎回必ず投入・読込）
STEP 2｜現在の技術スタック・フェーズに関連するML-IDを抽出する
STEP 3｜関連する教訓をセッション開始報告に「参考情報」として含める
STEP 4｜教訓の反映は社長の判断に委ねる（強制しない）
        唯一の例外：🟢フィードバックパターンのみ常時適用する
        ただし社長が「今回は違う」と言った場合はその指示を優先する

▌週次メンテナンスルール（記録チームが確認）
  □ 今週のLEARNING_LOGに昇格できる記録がないか確認する
  □ 同じ種別が3件以上たまった場合：共通パターンを抽出して新ML-IDとして登録する

▌管理ルール
  削除禁止・アーカイブ不要：全プロジェクト共通資産
  更新権限：記録チームが自律的に昇格・追記できる
  修正・削除権限：社長承認が必要
  新プロジェクト開始時：そのままの状態で投入する（リセット不要）

MASTER_LESSONS.md v1.0（アプリ特化版）— 🔄随時更新層。
全プロジェクトに必ず投入する永続ファイル。削除・アーカイブ禁止。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌教訓本体

━━━━━━━━━━━━━━━━
🔴 アンチパターン（地雷：回避必須）

<lesson_entry>
【ML-001】@ai-sdk/google v3: googleToolsは内部パッケージからインポートする

登録日：2026-05-17
種別：ミス防止
参照元：SNS運用プロジェクト / 技術：@ai-sdk/google v3.0.72

■ 教訓：`googleTools` は `@ai-sdk/google` からはエクスポートされていない。必ず `@ai-sdk/google/internal` からインポートする。

■ Before（NG）：
  import { google, googleTools } from "@ai-sdk/google";

■ After（OK）：
  import { google } from "@ai-sdk/google";
  import { googleTools } from "@ai-sdk/google/internal";

■ 再発防止策：新規プロジェクトでai-sdk/googleを使う際は必ずバージョンを確認し、
  v3以降は内部パッケージからのインポートに変更する。
  REQUIREMENTS_LOG.mdのバージョンロック欄に記録すること。
</lesson_entry>

<lesson_entry>
【ML-002】@ai-sdk/google v3: generateTextのmaxStepsパラメータは廃止済み

登録日：2026-05-17
種別：ミス防止
参照元：SNS運用プロジェクト / 技術：@ai-sdk/google v3.0.72、AI SDK v3

■ 教訓：`generateText` の `maxSteps` パラメータはAI SDK v3で削除された。
  使用するとTypeScriptエラーになる。代替は `stopWhen` （条件指定型）。

■ Before（NG）：
  await generateText({ ..., maxSteps: 3 });

■ After（OK）：
  await generateText({ ... }); // maxStepsを削除。必要なら stopWhen を使う

■ 再発防止策：AI SDKをアップグレードする際は必ず CHANGELOG を確認する。
  削除されたパラメータはTypeScriptの型エラーで検出できるので tsc --noEmit を必ず実行する。
</lesson_entry>

<lesson_entry>
【ML-003】@ai-sdk/google v3: googleTools.googleSearch() は引数オブジェクトが必須

登録日：2026-05-17
種別：ミス防止
参照元：SNS運用プロジェクト / 技術：@ai-sdk/google v3.0.72

■ 教訓：`googleTools.googleSearch` はファクトリ関数（ProviderToolFactory型）のため、
  引数なしで呼び出すとTypeScriptエラーになる。空オブジェクトでも必ず引数を渡す。

■ Before（NG）：
  googleTools.googleSearch

■ After（OK）：
  googleTools.googleSearch({})

■ 再発防止策：ProviderToolFactory型の関数は必ず呼び出し形式（末尾に()）で使う。
  型定義ファイル（.d.ts）を確認して引数の型を把握してから実装する。
</lesson_entry>

<lesson_entry>
【ML-004】外部ライブラリのAPIは必ずバージョン指定でバージョンロックする

登録日：2026-05-17
種別：判断基準
参照元：SNS運用プロジェクト全般

■ 教訓：ライブラリのメジャーバージョン（v2→v3等）が変わると、
  import先・パラメータ名・型定義が大幅に変わりTypeScriptエラーの山になる。
  プロジェクト開始時に使用バージョンをREQUIREMENTS_LOG.mdに記録し、
  アップグレードは社長承認後に行う。

■ 再発防止策：
  STEP 1｜npm install 後、package.json のバージョンをREQUIREMENTS_LOG.mdにコピーする
  STEP 2｜バージョンアップ前に必ずCHANGELOGを確認する
  STEP 3｜バージョンアップ後は tsc --noEmit で全型エラーを確認してから進める
</lesson_entry>

━━━━━━━━━━━━━━━━
🟢 フィードバックパターン（常時適用）

<lesson_entry>
【ML-005】TypeScriptエラーは「エラーを無視して進む」より「即座に根本解決」が速い

登録日：2026-05-17
種別：フィードバックパターン
参照元：SNS運用プロジェクト

■ 教訓：TypeScriptエラーを残したまま実装を進めると、後で連鎖的にエラーが増えて
  デバッグコストが2〜3倍になる。エラーが発覚した時点で作業を止めて根本原因を特定する。

■ 再発防止策：
  - OWNER_DEFAULTS.md SECTION 7「型エラー発覚時の強制ルール」を常に適用する
  - `npx tsc --noEmit --skipLibCheck 2>&1 | head -30` でエラー数を先に把握してから修正する
</lesson_entry>

━━━━━━━━━━━━━━━━
🔴 ミス防止（KYGNUS予約管理より昇格）

<lesson_entry>
【ML-006】モーダルクローズ関数がグローバル変数を副作用でnull化する場合、使用前にローカル変数へ退避せよ

登録日：2026-05-22
種別：ミス防止
参照元：LL-001, LL-002 / 発生PJ：KYGNUS予約管理 / 技術：Vanilla JS

■ 教訓：
グローバルなID変数を使った後にモーダルを閉じると、クローズ関数の副作用でIDがnullになる。
クローズ呼び出しの前に必ずIDをローカル変数に退避してから使う。

■ 具体例（Few-Shot）:
<bad_pattern>
async function executeDeleteReservation() {
  if (!activeDeleteReservationId) return;
  toggleDeleteModal(false); // ← ここで activeDeleteReservationId = null になる
  await GasClient.deleteReservation(activeDeleteReservationId); // null を渡してしまう
}
理由：toggleDeleteModal(false) の内部処理が activeDeleteReservationId = null を実行するため、
      その後の参照が全て null になり、DB操作が無効化される。
</bad_pattern>

<good_pattern>
async function executeDeleteReservation() {
  if (!activeDeleteReservationId) return;
  const idToDelete = activeDeleteReservationId; // ← クローズ前にローカル変数へ退避
  toggleDeleteModal(false);                     // ← ここでグローバルがnullになっても問題なし
  await GasClient.deleteReservation(idToDelete); // ローカル変数を使用
}
効果：クローズ関数の副作用に関わらず、正しいIDでDB操作が実行される。
</good_pattern>

■ 再発防止策 / 使い方：
「モーダルを閉じる関数を呼ぶ前に、その関数が副作用で何かをnull/クリアするか確認する」
対象変数があれば `const saved = globalVar;` で退避してから呼ぶ。

■ 適用できる場面：
確認モーダル・削除ダイアログ・編集フォームなど「グローバルに選択中IDを保持する」全てのUI実装。
</lesson_entry>

━━━━━━━━━━━━━━━━
🔵 設計パターン（KYGNUS予約管理より昇格）

<lesson_entry>
【ML-007】複数の非同期処理が並走するUIのローディング管理はboolean方式でなくcounter方式を使え

登録日：2026-05-22
種別：設計パターン
参照元：LL-003 / 発生PJ：KYGNUS予約管理 / 技術：Vanilla JS

■ 教訓：
ローディングスピナーをboolean（true/false）で制御すると、複数の非同期処理が並走した場合に
先に終わった処理がスピナーを消してしまう。カウンター方式を使えばこの競合が起きない。

■ 具体例（Few-Shot）:
<bad_pattern>
let isLoading = false;
function showLoading(show) {
  isLoading = show;
  loader.classList.toggle('hidden', !show);
}
// 処理AとBが並走すると、Aが終わった時点でBの途中でもスピナーが消える
理由：boolean方式は「最後に呼ばれた値」で状態が上書きされる。
</bad_pattern>

<good_pattern>
let _loadingCount = 0;
function showLoading(show) {
  if (show) {
    _loadingCount++;
    loader.classList.add('opacity-100');
    loader.classList.remove('pointer-events-none');
  } else {
    _loadingCount = Math.max(0, _loadingCount - 1);
    if (_loadingCount === 0) {
      loader.classList.remove('opacity-100');
      loader.classList.add('pointer-events-none');
    }
  }
}
// 全ての非同期処理が完了して初めてスピナーが消える
効果：A・Bが並走してもカウントが0になった時だけスピナーが非表示になる。
</good_pattern>

■ 再発防止策 / 使い方：
「このローディング中に別のローディング操作が発生し得るか？」を実装前に確認し、
Yes の場合はカウンター方式を採用する。

■ 適用できる場面：
カレンダー・リスト・フォームなど複数のAPI呼び出しが並走する可能性がある全てのUI。
showLoading関数を持つ全プロジェクトに適用推奨。
</lesson_entry>
