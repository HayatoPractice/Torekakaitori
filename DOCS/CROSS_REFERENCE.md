# CROSS_REFERENCE.md — カテゴリ横断クロスレファレンス
# 読込タイミング：設計・ライブラリ選定時 / 新プロジェクト開始時 / 他カテゴリからの流用を検討するとき
# 更新者：秘書チーム ｜ 更新タイミング：新カテゴリ追加・ライブラリ変更時

---

## ▌このファイルの目的

あるカテゴリで作業中に「他のカテゴリにも使えるパターンがあるのでは？」という
見落としを防ぐためのナビゲーションファイル。
各カテゴリの概要をここで把握し、詳細は各参照先ファイルで確認する。

---

## §1 カテゴリ別マスターサマリー

### カテゴリA：アプリ種別

| アプリ種別 | 主な目的 | 必須機能 | 推奨主力ライブラリ | 詳細参照 |
|---|---|---|---|---|
| **AI SaaS / テック系** | AI機能を中心とした近未来的プロダクト | 認証・API連携・ストリーミング表示 | HeroUI + Supabase Auth | UI_LIBRARY_GUIDE.md §5 |
| **ECサイト** | 商品販売・決済・カート管理 | 商品一覧・カート・決済・在庫 | shadcn/ui + Stripe | UI_LIBRARY_GUIDE.md §5 |
| **B2Bシステム / 金融・医療** | 大量データの正確な入出力 | DataGrid・フォームバリデーション・権限管理 | MUI + Ant Design | UI_LIBRARY_GUIDE.md §5 |
| **管理画面 / 設定パネル** | 高密度データ表示・設定操作 | テーブル・フィルター・バルク操作 | Ant Design | UI_LIBRARY_GUIDE.md §5 |
| **LP / マーケティング** | 訴求・CTA・ブランディング | ヒーロー・CTA・アニメーション | Tailwind UI + Headless UI | UI_LIBRARY_GUIDE.md §5 |
| **企業サイト / ポートフォリオ** | 情報発信・信頼感醸成 | レスポンシブ・アクセシビリティ | Chakra UI / DaisyUI | UI_LIBRARY_GUIDE.md §5 |
| **開発者向けツール / Docs** | 視認性・実用主義的UI | コードハイライト・サイドバーナビ | Primer（GitHub製） | UI_LIBRARY_GUIDE.md §5 |
| **データ分析 / ダッシュボード** | KPI可視化・リアルタイム更新 | グラフ・DataGrid・日付フィルター | MUI DataGrid + Recharts | UI_LIBRARY_GUIDE.md §5 |

---

### カテゴリB：UIライブラリ

| ライブラリ | 主な強み | 使いどころ | 共存時の注意点 | 詳細参照 |
|---|---|---|---|---|
| **HeroUI**（旧NextUI） | モダンアニメーション・ダークモード | 表舞台UI全般 | Tailwindプラグインとして登録必要 | UI_LIBRARY_GUIDE.md §1, §2 |
| **shadcn/ui** | ソースコード直接編集で完全制御 | カスタム度が高い部品 | コピーして使う設計（依存なし） | UI_LIBRARY_GUIDE.md §1 |
| **MUI** | DataGrid・日付選択が最強クラス | データ分析・複雑フォーム | `ScopedCssBaseline` で範囲限定必須 | UI_LIBRARY_GUIDE.md §2-③ |
| **Ant Design** | 高密度データ表示・親子フォーム | 管理画面・設定UI | `StyleProvider` でTailwindより下位に挿入 | UI_LIBRARY_GUIDE.md §2-④ |
| **Tailwind UI / Headless UI** | 最高品質マークアップ・アクセシビリティ | LP・マーケ画面 | Tailwind CSS の設定と統合 | UI_LIBRARY_GUIDE.md §1 |
| **DaisyUI** | JS不要・軽量・短いクラス名 | 補助的な部品・プロトタイプ | `daisy-` プレフィックスで競合回避 | UI_LIBRARY_GUIDE.md §2-② |

---

### カテゴリC：外部ツール・サービス

| ジャンル | 代表ツール | 主な用途 | 無料枠 | 詳細参照 |
|---|---|---|---|---|
| **Google Workspace** | Docs / Sheets / Drive / Calendar | ドキュメント・データ連携 | 個人アカウントで利用可 | TOOL_REFERENCE.md §D |
| **GCPインフラ** | Cloud Run / Functions / GCS / Firebase | サーバーレス・ストレージ・BaaS | 無料枠あり（条件あり） | TOOL_REFERENCE.md §E |
| **AI / LLM** | Claude API / Gemini / GPT / Vertex AI | テキスト生成・分析・分類 | 各社無料枠あり | TOOL_REFERENCE.md §G |
| **画像生成** | Stable Diffusion / DALL-E / Ideogram | アセット生成・バナー作成 | 無料枠あり（6ツール） | TOOL_REFERENCE.md §L |
| **セキュリティ** | Auth0 / Supabase Auth / OWASP ZAP | 認証・脆弱性チェック | Auth0/Supabase は無料枠あり | TOOL_REFERENCE.md §I |
| **監視・分析** | Google Analytics / Sentry / Datadog | エラー追跡・行動分析 | GA/Sentry は無料枠あり | TOOL_REFERENCE.md §J |
| **自動化** | GAS / Zapier / n8n / Cloud Scheduler | バックグラウンド処理・連携 | GAS/n8n は無料 | TOOL_REFERENCE.md §O |
| **地図・教育** | Google Maps / Mapbox / Stripe | 位置情報・決済 | 条件付き無料 | TOOL_REFERENCE.md §K |

---

### カテゴリD：開発フェーズ

| フェーズ | 主な目的 | 参照すべきファイル | 完了条件 |
|---|---|---|---|
| **設計** | 要件定義・技術選定・アーキテクチャ決定 | CROSS_REFERENCE.md | 実装計画書が承認された |
| **実装** | コーディング・ライブラリ統合 | MASTER_LESSONS.md, UI_LIBRARY_GUIDE.md | ビルドが通り機能が動作する |
| **検証** | バグ修正・テスト・セキュリティ確認 | SERVICE_ORG_CORE.md, MASTER_LESSONS.md | テストが全件パス |
| **デモ・リリース** | ユーザー確認・本番デプロイ | MASTER_LESSONS.md | 社長がOKを出した |

---

### カテゴリE：自動化パターン

| パターン | 概要 | 主なツール | 適用場面 | 詳細参照 |
|---|---|---|---|---|
| **スケジュール実行** | 定期バッチ処理 | GAS / Cloud Scheduler / n8n | 夜間集計・リマインダー | TOOL_REFERENCE.md §O |
| **イベントドリブン** | 特定アクションを起点に処理 | Cloud Functions / Zapier | フォーム送信後メール送信など | TOOL_REFERENCE.md §O |
| **パイプライン分解** | タスクを独立ステップに分割 | GAS / Python / Node.js | 複雑な多段階処理 | BIO_PIPELINE_INSIGHTS.md §1 |
| **外部知識注入** | 最新ドキュメントをLLMに動的投入 | MCP / web_fetch | AI機能・RAG構築 | BIO_PIPELINE_INSIGHTS.md §2 |
| **構造化出力** | JSON/XMLでパイプライン間データ受渡し | TypeScript型定義 | API連携・データ変換 | BIO_PIPELINE_INSIGHTS.md §5 |

---

### カテゴリF：AIモデル・ツール選定

| モデル / ツール | ベンチスコア目安 | 最適用途 | コスト感 | 詳細参照 |
|---|---|---|---|---|
| **Claude Opus 4.8** | 最高精度 | 複雑な設計・多段階推論・コード生成 | 高 | MASTER_LESSONS.md |
| **Claude Sonnet 4.6** | 高精度・高速 | 日常的なコーディング・レビュー | 中 | MASTER_LESSONS.md |
| **Gemini 3.5 Flash Thinking** | 78.0% | 推論・数学・ロジック問題 | 低〜中 | MASTER_LESSONS.md |
| **Gemini 3.5 Flash（標準）** | 45% | 軽量タスク・高速レスポンス重視 | 低 | MASTER_LESSONS.md |
| **Claude Design** | — | テキスト→UI生成（デザイン用途） | 中 | MASTER_LESSONS.md |
| **Google Pics** | — | 画像検索・ビジュアルリファレンス | 無料 | MASTER_LESSONS.md |

---

## §2 アプリ種別 × UIライブラリ クロスレファレンス

> ○ = 最適　△ = 使えるが最適ではない　— = 不向き

| | HeroUI | shadcn/ui | MUI | Ant Design | Tailwind UI | DaisyUI |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **AI SaaS / テック系** | ○ | △ | — | — | △ | △ |
| **ECサイト** | △ | ○ | — | — | ○ | △ |
| **B2Bシステム** | — | △ | ○ | ○ | — | — |
| **管理画面** | — | △ | △ | ○ | — | — |
| **LP / マーケ** | △ | — | — | — | ○ | △ |
| **企業サイト** | △ | △ | — | — | △ | ○ |
| **開発者ツール** | — | ○ | — | — | △ | △ |
| **データ分析** | — | — | ○ | △ | — | — |

**流用ポイント：**
- ECサイトのカート・モーダルは **shadcn/ui** で作り、管理画面の受注データ表示は **Ant Design** に切り替えると効率的
- AI SaaSのダッシュボード部分だけ **MUI DataGrid** を遅延ロードして使う（React.lazyで共存）
- DaisyUI はどのアプリ種別でも「補助的な軽量パーツ」として追加可能（JS不要のため副作用なし）

---

## §3 外部ツール × アプリ種別 クロスレファレンス

| | AI SaaS | ECサイト | B2Bシステム | 管理画面 | LP | ダッシュボード |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Claude / Gemini API** | ○ | △ | △ | △ | — | — |
| **Supabase** | ○ | ○ | ○ | ○ | — | ○ |
| **Firebase** | ○ | ○ | △ | △ | — | △ |
| **Stripe** | △ | ○ | ○ | — | △ | — |
| **Google Sheets / GAS** | △ | △ | ○ | ○ | — | ○ |
| **n8n / Zapier** | ○ | ○ | ○ | ○ | — | △ |
| **Google Analytics** | ○ | ○ | △ | — | ○ | — |
| **Sentry** | ○ | ○ | ○ | ○ | — | △ |
| **画像生成AI** | ○ | ○ | — | — | ○ | — |
| **Google Maps** | — | △ | ○ | △ | △ | — |

**流用ポイント：**
- **Supabase** は全アプリ種別で汎用的。認証・DB・ストレージをまとめて担えるため、ECサイトで使ったパターンをAI SaaSにそのまま流用できる
- **GAS + Google Sheets** は管理画面の「エクセル的なデータ閲覧ニーズ」に対してゼロコストで実現できる。ECサイトの在庫管理にも転用可
- **n8n** はB2BのワークフローとECの注文通知を同じパターンで処理できる

---

## §4 開発フェーズ × 参照ファイル クロスレファレンス

| フェーズ | 必読ファイル | 確認すべきカテゴリ | よく使うツール |
|---|---|---|---|
| **設計** | CROSS_REFERENCE.md | カテゴリA（種別）, B（UI）, C（ツール） | Claude Opus（設計レビュー） |
| **実装** | MASTER_LESSONS.md, UI_LIBRARY_GUIDE.md | カテゴリB（UI）, E（自動化） | Claude Sonnet（コーディング） |
| **検証** | SERVICE_ORG_CORE.md, MASTER_LESSONS.md | カテゴリC（セキュリティ §I） | Sentry, OWASP ZAP |
| **デモ・リリース** | MASTER_LESSONS.md | カテゴリC（GCP §E）, F（AIモデル） | Cloud Run, Firebase Hosting |

---

## §5 カテゴリ横断・流用パターン集

以下は「このカテゴリの機能が、別カテゴリでそのまま使える」と確認済みのパターンです。

---

**【流用パターン 1】認証フロー → 全アプリ種別で共通**
```
ECサイトで構築した Supabase Auth（メール+Google OAuth）は
AI SaaS・B2Bシステム・管理画面に設定変更なしで流用できる。
参照：TOOL_REFERENCE.md §I（セキュリティ）, §E（GCPインフラ）
```

**【流用パターン 2】MUI DataGrid → ECサイトの受注管理にも**
```
データ分析ダッシュボード用に実装した MUI DataGrid は
ECサイトの管理者向け受注一覧・在庫管理画面にそのまま転用できる。
React.lazy で遅延ロードすれば EC フロントの速度にも影響なし。
参照：UI_LIBRARY_GUIDE.md §3（遅延ロード）, §2-③（ScopedCssBaseline）
```

**【流用パターン 3】GAS自動化 → LP問い合わせ → B2B受注管理**
```
LPのお問い合わせフォーム送信時に GAS でスプレッドシートへ自動記録する仕組みは、
B2Bシステムの見積り依頼・受注管理フローに構造ごと流用できる。
参照：TOOL_REFERENCE.md §O（自動化パターン）, §D（Google Workspace）
```

**【流用パターン 4】画像生成AI → ECサイト × AI SaaS 両方で活用**
```
AI SaaSで使った画像生成API（Stable Diffusion / DALL-E）は
ECサイトの商品サムネイル自動生成・バナー生成にも転用できる。
参照：TOOL_REFERENCE.md §L（画像生成）
```

**【流用パターン 5】ローディングカウンター方式 → 並列APIを持つ全アプリ**
```
MASTER_LESSONS.md に記録済みのローディングカウンター実装は
複数のAPIを並列呼び出しするダッシュボード・ECサイト・管理画面で共通して使える。
参照：MASTER_LESSONS.md **ML-007**「複数非同期並走時のローディング管理はcounter方式を使え」
```

**【流用パターン 6】DaisyUI スピナー → 全ライブラリの遅延ロード中表示**
```
HeroUI / MUI / Ant Design の遅延ロード（React.lazy）中の fallback に
DaisyUI のスピナーを使うと、JS不要で軽量なローディング表示が実現できる。
UI_LIBRARY_GUIDE.md §3 のコード例で採用済み。
参照：UI_LIBRARY_GUIDE.md §3（パフォーマンス）
```

**【流用パターン 7】プロンプトテンプレート → アプリ種別をまたいで再利用**
```
AI SaaSで設計したシステムプロンプト（XML構造化・Role定義）は
B2Bシステムのデータ分析機能・管理画面のレポート生成AIに構造ごと転用できる。
参照：MASTER_LESSONS.md §PE-001〜PE-005（プロンプトエンジニアリング基礎）
```

---

## ▼更新ルール

**更新する情報とタイミング（APP_SHARED_RULES.md §8-4 と連動）：**

- 新しいアプリ種別・ライブラリ・ツールが採用されたとき → §1 の対応カテゴリに追記
  - **トリガー**：セッション終了時のチェックリスト（APP_SHARED_RULES.md §8-4）で確認
  - **担当**：記録チーム（秘書が確認・承認）
- 実装中に「他で使えそう」と気づいたパターン → §5 に追記して MASTER_LESSONS.md にも昇格
  - **トリガー**：同上（セッション終了時）
- クロスレファレンス表（§2・§3）は採用実績が増えたら○△を更新する

> ⚠️ **未登録ライブラリの扱い方**：
> このファイルに登場するライブラリは UI_LIBRARY_GUIDE.md の導入ガイドと対応していること。
> **UI_LIBRARY_GUIDE.md に実装ガイドがないライブラリは「参照専用・実装ガイドなし」と明記すること。**
> 現在参照専用ライブラリ：**Primer**（GitHub製）、**Chakra UI**（UI_LIBRARY_GUIDE.md未登録）

---

CROSS_REFERENCE.md v1.0 — カテゴリ横断クロスレファレンス。設計・ライブラリ選定時の見落とし防止。
