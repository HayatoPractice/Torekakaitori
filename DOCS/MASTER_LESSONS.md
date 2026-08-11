📘 MASTER_LESSONS.md — 全プロジェクト横断マスター教訓集 v1.0（アプリ特化版）
管理者：記録チーム（昇格判断）＋ 秘書（週次確認）
層：🔄 随時更新層（記録チームが昇格判断・追記）
持ち運び：全プロジェクトに必ず投入する（リセット不要・永続的に育てる）

▌変更履歴
バージョン  日付    変更内容                                        変更者
v1.0        初版    ビジネス版から分離・アプリ開発に特化して新規作成  秘書

▌3ファイルの役割の違い
  LEARNING_LOG.md   → プロジェクト内の詳細な記録（何が起きたかの事実）
  MINUTES.md → 今のプロジェクトの現在地スナップショット
  MASTER_LESSONS.md → 汎用できると判断した教訓の要約集（知恵の蓄積）

▌このファイルの使い方
  投入：毎回必ず投入する（空欄でもOK）
  反映：参考扱い・採用は社長が判断する
  例外：🟢フィードバックパターンのみ常時適用する

重複について：
  MINUTES.mdと内容が重複することがある→正常（矛盾ではない）
  PROJECT_STATE：プロジェクト固有の詳細文脈
  MASTER_LESSONS：汎用化・抽象化した教訓（粒度が違う）

> 📌 **汎用エッセンス（全プロジェクト共通の価値ある知見）**
> - 教訓は「汎用適用可能」な知恵だけを昇格させる。プロジェクト固有の詳細は MINUTES.md に留める
> - 同じ失敗を2回繰り返さないことが第一目標。新セッション開始時に必ずこのファイルを参照する
> - AIツールの性能・料金は頻繁に変わる。「いつの情報か」を意識して使う
> - 重量級ファイルは全文読み禁止。索引→部分読みでトークンを節約する
> （全体の汎用知見は DOCS/ESSENCE_INDEX.md に集約）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌昇格ルール（LEARNING_LOG / PROJECT_STATEからの抽出基準）

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
  → セッション終了時にPROJECT_STATEを更新するタイミングで同時に確認する
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
| ML-008 | 設計パターン       | 本番を直接触らない「隔離された実験室」開発の鉄則           | 全プロジェクト  | Git全般           | 2026-05-29 |
| ML-009 | ミス防止           | HTML/CSS修正時にJSのクラス名を変えると動作が壊れる        | 全プロジェクト  | HTML/CSS/JS       | 2026-05-29 |
| ML-010 | 設計パターン       | 自動テストはPlaywright + GitHub Actionsで本番前に必ず通す | 全プロジェクト  | CI/CD             | 2026-05-29 |

▌プロジェクト別サマリ

| プロジェクト名         | 登録件数 | 主な種別                              | 登録ML-ID      |
|---------------------|--------|-------------------------------------|--------------|
| SNS運用プロジェクト   | 5件    | ミス防止・判断基準・フィードバックパターン | ML-001〜ML-005 |
| KYGNUS予約管理        | 2件    | ミス防止・設計パターン                  | ML-006〜ML-007 |
| 全プロジェクト共通     | 3件    | 設計パターン・ミス防止                  | ML-008〜ML-010 |

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
🔵 設計パターン（全プロジェクト共通・最重要原則）

<lesson_entry>
【ML-008】本番・JS・mainブランチを直接触らない「隔離された実験室」開発の鉄則

登録日：2026-05-29
種別：設計パターン
参照元：全プロジェクト共通知見 / 技術：Git全般・WordPress・CI/CD

■ 教訓：
「本尊（本番環境・既存のJS・mainブランチ）は絶対に直接触らない・汚さない」
必ず「隔離された安全な実験室」を作り、そこで気が済むまでテストする。
完璧になった差分だけをボタン一つで安全に本番へ上書き（マージ）する。

■ 実験室の作り方（Git）:
<good_pattern>
# 実験室を作って切り替える
git checkout -b feature/xxx

# 実装・テストが完了したら本番へ送る
git push origin feature/xxx
# → GitHub でプルリクエスト → マージ → 本番に反映

# 手元を最新に同期
git checkout main && git pull
</good_pattern>

■ WordPressでの対応：ステージング環境（本番の完全クローンURL）でテストしてから本番に上書き反映

■ 再発防止策：
「今からmainに直接コミットしようとしていないか？」を常に確認する。
Gitは「誰がmainに直接書き込んだか」を100%記録として残す。

■ 適用できる場面：全フェーズ・全プロジェクト。習慣にする。
</lesson_entry>

<lesson_entry>
【ML-009】HTML/CSS修正時にJSのクラス名・変数名を変えると動作が壊れる

登録日：2026-05-29
種別：ミス防止
参照元：全プロジェクト共通知見 / 技術：HTML/CSS/JavaScript

■ 教訓：
AIがHTML/CSSを修正する際、JSが参照しているクラス名（querySelector等）を
変えてしまうとJSの動作が壊れる。JSのロジックは「本尊」として守る。

■ 具体例（Few-Shot）:
<bad_pattern>
<!-- AIがHTML修正時に変えた例 -->
<button class="submit-btn">送信</button>  ← クラス名を変えた

// JSは古い名前で参照しているため動作しない
document.querySelector('.btn-submit').addEventListener('click', ...)
理由：AIがデザイン的に「submit-btn → btn-submit」と変更したが、
     JS側は古い名前のまま → クリックが反応しなくなる
</bad_pattern>

<good_pattern>
<!-- JSが参照するクラスには js- プレフィックスをつけて保護する -->
<button class="submit-btn js-submit-btn">送信</button>

// JSは js- プレフィックスのクラスだけを参照
document.querySelector('.js-submit-btn').addEventListener('click', ...)
効果：AIへ「js-で始まるクラス名は絶対に変更しないこと」と命令すれば
     デザイン変更とJS動作の保護を両立できる
</good_pattern>

■ AIへの命令テンプレート：
「HTML/CSSを修正してください。ただし js- で始まるクラス名は絶対に変更しないこと。
 もしクラス名の変更が必要な場合は、JSのコードも同時に修正すること。」

■ 万が一クラス名が変わった場合の対処：JSの都合に合わせてHTMLを直す（JSは守る）

■ 適用できる場面：AIにHTML/CSS修正を依頼する全ての場面
</lesson_entry>

<lesson_entry>
【ML-010】自動テストはPlaywright + GitHub Actionsで本番反映前に必ず通す

登録日：2026-05-29
種別：設計パターン
参照元：全プロジェクト共通知見 / 技術：Playwright・GitHub Actions・CI/CD

■ 教訓：
コードを本番に反映する前に、Playwright（ブラウザ自動操作）で
「実際にクリックして動くか」を自動確認するパイプラインを作っておく。
GitHub Actionsでpush時に自動実行すれば人間がテストしなくてよくなる。

■ 基本的な考え方:
<good_pattern>
# テストが落ちたら絶対にマージできない仕組みを作る
GitHub Actions（ロボット）が git push のたびに自動実行：
  1. Playwrightで「ボタンをクリック → 正しい画面が出るか」を確認
  2. 全テストが通れば → マージOK
  3. 1つでも失敗したら → マージをブロック（本番に壊れたコードが入らない）
</good_pattern>

■ コスト：Playwrightは完全無料。GitHub Actionsは月2,000分の無料枠あり。

■ 素人でもできる代案（自動化が難しい場合）：
  → Claude Codeに「手元でテストして落ちたら自動で直して」と丸投げ
  → AutifyなどノーコードテストツールでPlaywrightを使わずにE2Eテスト

■ テストファイル配置：
  e2e/[機能名].spec.ts（Playwright E2Eテスト）
  src/tests/[対象].test.ts（Vitestユニットテスト）

■ 適用できる場面：本番公開するWebアプリ・フォーム・認証機能を持つ全プロジェクト
</lesson_entry>

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
  - MASTER_LESSONS.md SECTION 7「型エラー発覚時の強制ルール」を常に適用する
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌プロンプトエンジニアリング基礎
関連参照：PE-006（統合的教訓・AIエージェント活用原則）/ AI_TOOLS_REFERENCE.md（モデル選定・自動化パターン）

<lesson_entry id="PE-001" category="プロンプト設計" priority="standard">
■ タイトル：構造化プロンプト（XMLタグの活用）
■ 原則：
全ての指示・データ・思考プロセスをXMLタグで囲み、AIが情報を混同しないようにする。
- `<thinking>`: 内部推論・リスク分析
- `<instructions>`: 具体的な命令
- `<example>`: Few-shot用の例示
- `<context>`: 背景情報
</lesson_entry>

<lesson_entry id="PE-002" category="プロンプト設計" priority="standard">
■ タイトル：思考プロセス（Chain-of-Thought）の標準化
■ 原則：
重大な判断・複雑な実装前に `<thinking>` タグ内で以下を検討する。
1. 前提条件の確認：何が分かっていて何が不明か
2. リスク評価：既存機能への影響・セキュリティ・パフォーマンス
3. 代替案の比較：複数アプローチを検討し最善策を選んだ理由
4. 検証計画：どうテストし成功を定義するか
</lesson_entry>

<lesson_entry id="PE-003" category="プロンプト設計" priority="standard">
■ タイトル：Few-shot / One-shot プロンプティング
■ 原則：
- One-shot：複雑なアルゴリズムや特定フォーマットが必要な場合、1つの完璧な例を提示するだけで精度が劇的に向上
- Few-shot：出力のトーンやスタイルを厳密に制御したい場合、複数の例を提示する
</lesson_entry>

<lesson_entry id="PE-004" category="プロンプト設計" priority="optional">
■ タイトル：刺激プロンプト（Stimulus Prompting）
■ 原則：
複雑な課題に対し、命令の最後に以下のような「刺激」を加えるとモデルの注意力が高まる。
例：「このセキュリティチェックを通過しない限り、リリースは許可されません」
例：「効率性を極限まで追求し、計算量を最小限に抑えてください」
</lesson_entry>

<lesson_entry id="PE-005" category="プロンプト設計" priority="standard">
■ タイトル：プロンプト自己改善ループ
■ 原則：
AIの結果が期待に沿わない場合、単にやり直すのではなく
「プロンプトのどこに誤解を招く表現があったか」を自己分析し、
プロンプト自体を修正してから再試行する。
</lesson_entry>

<lesson_entry id="PE-006" category="プロンプト設計・AI活用" priority="standard">
■ タイトル：統合的教訓（AI開発の本質3原則）
■ 原則：
1. **検証の自動化**：コードを書くだけでなく、それが「正しい」ことをAI自身がテストを通じて証明する仕組みが必須。実装と検証をセットで行うことでバグの混入を防ぐ。
2. **継続的なリファイン**：プロンプトは一度書いて終わりではなく、実証的な評価に基づいて反復的に改善し続けるべきである。結果が悪ければプロンプト自体を見直す（PE-005参照）。
3. **コンテキストの純度**：必要な情報のみを、最適なタイミングで、最適な構造で提供することがAIのパフォーマンスを決定づける。不要なファイルの全読みを避け、ピンポイント読込を徹底すること（→ DOCS_INDEX.md の2層構造設計の根拠）。
</lesson_entry>

<lesson_entry id="ML-IME-001" category="UI実装・日本語対応" priority="critical">
■ タイトル：Enterで送信する入力欄は、必ずIMEの「変換確定Enter」を除外する

■ 症状：
日本語を入力し、スペースで変換した未確定状態（下線付き・範囲選択されたような表示）で
Enterを押すと、**確定のつもりのEnterが「送信」として扱われ、変換途中の文字列が送信される**。

■ 原因：
日本語入力(IME)では、変換確定のEnterも通常のEnterと同じ `key === "Enter"` として飛んでくる。
「今まさに変換中か」を判定しないと、確定操作を送信操作と誤認する。

■ 対策（Before / After）：
```tsx
// Before（誤り）— 日本語入力で必ず壊れる
onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
}}

// After（正しい）
onKeyDown={(e) => {
  if (isImeComposing(e)) return;   // 変換中は何もしない
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
}}

// 判定は1か所に共通化して使い回す（片方だけ実装する事故を防ぐ）
export function isImeComposing(e: React.KeyboardEvent): boolean {
  const n = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
  return n?.isComposing === true || n?.keyCode === 229; // 229は保険
}
```

■ 重要な注意点：
1. **英語入力だけのテストでは絶対に再現しない。** 必ず日本語で動作確認すること。
2. **影響範囲は1か所ではない。** Enter送信している箇所を全部洗い出して一括で直す。
   実例では5か所すべてが同じ問題を抱えていた。
   確認：`grep -rn 'key === "Enter"' src/` と `grep -rn "isComposing" src/`
3. 日本語を扱う全アプリに共通する問題。新規に入力欄を作るたびにセットで実装する。

■ 出典：INC-009（英会話学習アプリ / 2026-08-09、本番でユーザーが発見）
</lesson_entry>

<lesson_entry id="ML-E2E-001" category="開発環境・自動検証" priority="high">
■ タイトル：ブラウザ自動検証が失敗したら、アプリを疑う前にまず1回そのまま再実行する

■ 症状：
コードは正常なのに、ヘッドレスブラウザ（puppeteer等）の自動検証が失敗・誤検知する。
毎回「アプリが壊れた」と誤解して調査に時間を取られる。

■ 判断の指針：
**再実行で通れば環境要因。毎回同じ箇所で落ちればアプリ側の問題。**
この一手間だけで原因調査の時間を大幅に減らせる。

■ よくあるパターンと対処：
| 症状 | 原因 | 対処 |
|---|---|---|
| `Navigating frame was detached` | ブラウザの一時的な切断。失敗箇所が毎回変わる | 残留プロセスを落として再実行 |
| `Timed out ... WS endpoint URL` | 前回のブラウザが残っている | `pkill -9 -f "Google Chrome for Testing"` |
| 全要素が未スタイルで数千件の差分 | 開発サーバ起動中に `npm run build` して `.next` が破損 | `rm -rf .next` して再起動 |
| 突然500・`Cannot find module './xxx.js'` | 同上（`.next` 破損） | `rm -rf .next` して再起動 |
| ボタンを押しても何も起きない | ヘッドレスは毎回新しい匿名IDを作るためデータが空 | 実データを持つIDを localStorage に注入 |

■ 予防策：
1. 検証スクリプトは必ず `try { ... } finally { await browser.close(); }` で閉じる
   （例外時にブラウザが残り、次回の起動を妨げる）
2. 起動前に古いブラウザプロセスを落とす
3. **開発サーバ起動中に `npm run build` を実行しない**
4. UI比較には「CSSが適用されているか」の健全性チェックを入れる
   （`document.styleSheets.length === 0` なら中断する）
5. 検証で作られた匿名IDが本番DBに溜まる点にも注意し、定期的に掃除する

■ 出典：INC-010（英会話学習アプリ / 2026-08-09。同一セッション中に複数回発生）
</lesson_entry>

<lesson_entry id="ML-SCHEMA-001" category="DB設計・リファクタリング" priority="high">
■ タイトル：テーブルを消しても「初期構築SQL」に定義が残り、DB再構築で復活する

■ 症状：
機能整理で不要になったテーブルをDBから削除し、コード・型・ドキュメントも整理して
テスト・ビルド・E2Eも全て通っている。しかし**DBを作り直すと削除したテーブルが全部復活する**。

■ 原因：
初期構築用のSQLファイル（`neon_schema.sql` 等）に `CREATE TABLE` が残っており、
README等が「SQL Editorに丸ごと貼り付けてRun」と案内しているため。

■ なぜ気づけないか：
既存DBは正しい状態なので、**動作テストでは絶対に検出できない**。
表面化するのは環境移行・障害復旧という、最も余裕がない場面だけ。
さらに `grep --include='*.ts'` のようなコード限定検索からSQLファイルは漏れる。

■ 対処（Before / After）：
```bash
# Before：コードだけ検索して「残骸なし」と判断する
grep -rn "gemini_questions" --include='*.ts' --include='*.tsx' .

# After：拡張子を限定せず、SQL・ドキュメント・設定まで含めて検索する
grep -rn "gemini_questions" --include='*.ts' --include='*.tsx' \
     --include='*.sql' --include='*.json' --include='*.md' . | grep -v node_modules
```

■ 重要：初期構築SQLを「丸ごと削除」してはいけない
アプリが起動時に自動作成するテーブルと、このSQLでしか作られないテーブルが
混在していることがある。実例では10テーブル中4つがSQLファイル専属で、
消していたらDBを作り直せなくなっていた。**先に「どのテーブルを誰が作るか」を確認する**。

■ 修正後は2方向で実測する（推測で終わらせない）：
1. **既存DBへの無害性**：ファイル全体を実行し、実行前後で列・索引・テーブル・データ件数を
   丸ごと比較して完全一致を確認する（`IF NOT EXISTS` 付きでも実際に流して確かめる）
2. **新規構築の正しさ**：隔離した検証用スキーマに流し、本番と列レベルで一致するか確認する
```sql
CREATE SCHEMA verify_fresh;   -- テーブル名を verify_fresh.xxx に置換して実行
-- 本番スキーマと列を比較 → DROP SCHEMA verify_fresh CASCADE;
```
本番を汚さずに「まっさらから作れるか」を試せるため、他の場面でも応用が利く。

■ 同時に確認すべき残骸（実例で全て見つかった）：
初期構築SQL / READMEの「実装済み[x]」 / セットアップ手順書のテーブル一覧 /
型定義（33型中22型が未使用だった） / 到達不能な分岐 / `ensureXxxSchema()`

■ 出典：INC-011（英会話学習アプリ / 2026-08-10。機能整理22→15に伴う9テーブル削除時）
</lesson_entry>

<lesson_entry id="ML-LONGJOB-001" category="設計・バックグラウンド処理" priority="critical">
■ タイトル：時間のかかる処理は「必ず途中で切られる」前提で作る（切られると成果が0件と誤報告される）

■ 症状：
「100件作って」と指示 → 画面に**「0件追加しました」と成功扱いで表示**。
しかしDBを見ると**65件は実際に追加されていた**。データではなく表示が嘘をついていた。

■ 原因（3つ重なる）：
1. **実行時間の上限**：1回のリクエストで粘る設計だった。サーバーレスには上限がある
   （Vercel Hobbyは60秒。`maxDuration = 300` と書いてもプランの上限は超えられない）。
   259秒動いた末に応答ごと切られ、最後の「完了」イベントが届かなかった。
2. **完了イベントだけで数えていた**：届かないと初期値0のまま、しかも未完了フラグも立たず成功表示。
   サーバーは1件ごとに保存イベントを送っていたのに、受け手が捨てていた。
3. **生成物の32%が既存データと重複**：AIに「既にあるもの」を伝えていなかった。

■ 対処（Before / After）：
```ts
// Before：完了イベントだけに頼る → 切れたら 0 のまま「成功」表示
let doneCount = 0;
if (evt.type === "done") doneCount = evt.count ?? 0;
setLastResult({ added: doneCount, incomplete });

// After：1件ごとの保存イベントを数え、完了は「あれば使う」程度に留める
if (evt.type === "saved") savedSeen++;
if (evt.type === "done")  doneCount = evt.count ?? 0;
return { added: doneCount ?? savedSeen, gotDone: doneCount !== null };
// 完了が来なければ「未完了」として実数を添えて報告する
```

■ 設計の型（そのまま流用できる）：
- サーバー：1回を**上限の8割以下**（60秒上限なら50秒）で切り上げ、その回の成果を返す
- クライアント：目標に届くまでチャンクを繰り返し、成果を**通しで積み上げる**
- **待機はサーバー側でやらない**。関数内 `sleep` は実行時間を食い潰し、待った末に切られる。
  レート制限の回復待ちは、時間制限のないクライアント側で行う
- 歯止め：回数上限・全体時間上限・**「前回より残りが減っていなければ打ち切る」**

■ 併発しやすい罠：
**分割方式にしたのに「続きを呼ぶ」を実装し忘れる。** 同じアプリ内の別APIで実際に起きており、
「22件処理・残り40件」で止まったまま放置されていた。分割と再開は必ずセットで実装する。

■ 切り分けの決め手：
**外部API呼び出しの成否・エラー種別・所要時間をログに残しておくこと。**
「AI呼び出しは95回成功」と分かった瞬間に、原因を生成側ではなく保存・集計・表示側へ絞り込めた。
これが無ければ切り分け不能だった。

■ 出典：INC-012（英会話学習アプリ / 2026-08-10。単語100件の一括生成）
</lesson_entry>
