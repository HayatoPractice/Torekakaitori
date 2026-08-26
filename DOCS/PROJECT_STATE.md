# PROJECT_STATE.md — プロジェクト現在地

最終更新：2026-08-26

## フェーズ
Phase 3: 本番デプロイ完了・実運用開始待ち

## 概要
トレカ（BOX/パック単位）の販売相場・買取相場を、Xの複数アカウント投稿（手動投入）から
収集・AI解析・横断比較できるアプリ。実装・実データでのE2E確認・本番デプロイまで完了。
GitHub: https://github.com/HayatoPractice/Torekakaitori
本番URL: https://torekakaitori-zeta.vercel.app （アプリ側のBasic認証で非公開。パスワードは
Vercelの環境変数 BASIC_AUTH_PASSWORD を参照。`torekakaitori-souba.vercel.app` は廃止）

## 直近の決定事項
- Xの自動巡回は行わない（有料APIが前提になるため。手動投入方式を採用）
- 認証なし（開発者本人専用）。デプロイ先の非公開化は`src/proxy.ts`によるBasic認証で対応
  （Vercel Hobbyプランでは本番ドメインをVercel Authenticationで保護できないため。INC-071参照）
- スタック：Next.js(App Router) + TypeScript + Tailwind + Neon(Postgres, `@neondatabase/serverless`で直接SQL) + Gemini API(`gemini-3.6-flash`)
- 投稿画像はNeonにファイルストレージが無いため、DBにbytea（バイナリ）として直接保存
- データ取得はSWR（useEffect+fetchの直書きは避ける方針。CODE_ANTI_PATTERNS.md AP-A1準拠）

## 実装済み機能（実データでE2E確認済み）
- アカウント管理（複数登録・選択）
- 投稿登録（URL/テキスト/画像の複数投入・一括投入、AI解析、確信度によるレビュー要否判定）
- 商品名の名寄せ（表記ゆれ統合UI・マージAPI）、重複投稿検知（URL一致・内容ハッシュ一致）
- 日別横断参照、アカウント別まとめ（販売⇔買取比較・スプレッド表示）
- 商品別の価格推移グラフ・店舗ランキング
- CSVエクスポート、画像の保存・配信（/api/images/[id]）、Xブックマークレット
- scripts/guard.mjs をこのアプリ向けに書き換え、self-testで実際に検知することを確認済み

## デプロイ状態
- Neonプロジェクト作成・マイグレーション実行済み
- Vercelプロジェクト `torekakaitori` に環境変数（DATABASE_URL/GEMINI_API_KEY/GEMINI_MODEL/
  BASIC_AUTH_PASSWORD/BASIC_AUTH_USER）設定済み
- Framework PresetをNext.jsへ修正済み（Otherのままだと本番が404になっていた。INC-071）
- アプリ側Basic認証（src/proxy.ts）で本番URLへの第三者アクセスを遮断済み・実際に401/200を確認済み
- GitHub push → Vercel自動デプロイの一連の流れを確認済み

## 次のアクション（ユーザー側の作業）
実際に追いたい店舗のXアカウントを「アカウント管理」から登録し、投稿の手動投入を開始する。
本番URLを開くとBasic認証のダイアログが出るので、ユーザー名/パスワードを入力すること
（値はVercelのBASIC_AUTH_USER/BASIC_AUTH_PASSWORD環境変数を参照）。

## 今回のセッションで見つけて直した不具合
- INC-071: VercelがフレームワークをOtherと誤検知し本番が最初から404だった上、Hobbyプランでは
  本番ドメインをVercel Authenticationで保護できず実質公開状態になっていた（Basic認証で対処済み）
- INC-070: Neonのdate型がJSON化でタイムゾーンずれの日時文字列になり、CSV・グラフ表示が
  壊れていた（実データE2E確認で発見・修正・再確認済み）
- INC-069: テンプレート複製由来でgit originが共有テンプレート配布リポジトリを指したままだった
  （originを削除し解消。guard.mjsに再発検知を追加）
- Vercel側で同一リポジトリから重複プロジェクト（torekakaitori-app）が作られていたため削除し一本化

## 既知の制約
- 商品の名寄せは完全一致（大文字小文字無視）のみ。表記ゆれは手動統合UIで対応
- BASIC_AUTH_PASSWORDが未設定だと認証が無効化される（guard.mjsのINC-035で存在確認のみ可能。
  値の設定漏れ自体はguardでは検知できないため、Vercelの環境変数設定を都度確認すること）
