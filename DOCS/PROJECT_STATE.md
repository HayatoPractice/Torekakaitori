# PROJECT_STATE.md — プロジェクト現在地

最終更新：2026-08-26

## フェーズ
Phase 3: 本番デプロイ完了・実運用開始待ち

## 概要
トレカ（BOX/パック単位）の販売相場・買取相場を、Xの複数アカウント投稿（手動投入）から
収集・AI解析・横断比較できるアプリ。実装・実データでのE2E確認・本番デプロイまで完了。
GitHub: https://github.com/HayatoPractice/Torekakaitori
本番URL: https://torekakaitori-zeta.vercel.app （2026-09-01、ユーザーの指示によりBasic認証を
撤廃。URLを知っていれば誰でも認証なしでアクセスできる公開状態。`torekakaitori-souba.vercel.app` は廃止）

## 直近の決定事項
- Xの自動巡回は行わない（有料APIが前提になるため。手動投入方式を採用）。
  「投稿URL」欄（page.tsx・bookmarklet）はXのAPIを一切呼ばない単なる文字列貼り付けで、
  重複チェックと元投稿リンク表示にのみ使う。この用途である限り無料枠の制約は受けないため
  削除不要と2026-09-01に確認済み。**未使用に見えても削除しないこと**（コード側にも
  同趣旨のコメントあり）。将来Xの有料APIを導入する場合は、この欄を自動取得へ
  切り替える拡張ポイントとして残している
- マルチユーザー機能（ユーザーごとのログイン・データ分離）を2026-09-01に撤廃し、単一ユーザー
  運用に戻した。続けてBasic認証（`src/proxy.ts`）も同日ユーザーの指示で完全に撤廃し、
  本番URLは無認証で誰でもアクセス可能になっている（guard.mjsのINC-035は対象外化済み）
- 2026-09-02、ホーム画面（`/`）を投稿登録フォームから商品・相場比較ページへ入れ替えた。
  投稿登録は `/post` に移動（ナビゲーションの左から2番目）。旧`/products`（一覧）は削除済み
  （`/products/[id]`の商品詳細はそのまま）
- 2026-09-02、ブックマークレットを拡張し、Xのタイムライン/プロフィールページで直近の投稿を
  まとめて読み取れるようにした（`/api/scrape-import`が一時保存→`/post/bulk`でレビューして
  1件ずつ`/api/posts`へ登録）。DOMの`data-testid`に依存するため、Xの仕様変更で壊れる可能性が
  ある点はユーザー了承済み。画像はpbs.twimg.com等のURLを`/api/fetch-image`（ホスト許可制の
  プロキシ）経由でサーバー側から取得している（ブラウザから直接fetchするとCORSで失敗するため）
- 2026-09-02、ホーム画面（商品・相場比較）に複数商品選択のトレンド比較棒グラフを追加。
  一覧の各商品にチェックボックスを追加し、選択すると`/api/summary/products/compare`
  （1日単位/年単位で平均価格を集計、価格区分は販売/買取を切り替え可能）を叩いて表示する
- 2026-09-02、商品に代表画像（1枚・任意）を持たせられるように。投稿画像と同じくbytea保存
  （`/api/products/[id]/image`）。アップロードはホーム画面の商品一覧の各行から行う設計にし、
  画像はユーザー自身が用意したものを使う方針（著作権・誤マッチのリスクがあるため、AIによる
  ネット検索での自動収集は採用しなかった）。一覧・詳細APIは`has_image`フラグのみ返し、
  画像本体（bytea）を一覧に含めない設計にしている（post_imagesと同じ理由）
- 2026-09-02、コード監査＆整理を実施。①`@types/node`を実際の本番Node（Vercel=24.x）に合わせて
  `^24`へ、`engines.node`を明記、②zodを実際に導入し主要APIルート（accounts/posts/items/
  products merge/scrape-import）の手書きバリデーションを`src/lib/validation.ts`のスキーマへ
  置き換え（エラーメッセージは全て日本語で統一）、③`todayLocalDate`等の重複を`src/lib/date.ts`へ、
  `¥`表示・価格区分ラベルの重複を`src/lib/format.ts`へ集約、④未使用の`ExtractedItemView`型を削除
  （`ItemType`/`PostStatus`は他の型定義内部で使われているため残置）、⑤`scrape_batches`に
  「新規作成のたびに24時間より古い行を掃除する」使い捨てクリーンアップを追加、
  ⑥tsconfigの`target`をES2017→ES2022に更新
- スタック：Next.js(App Router) + TypeScript + Tailwind + Neon(Postgres, `@neondatabase/serverless`で直接SQL) + Gemini API(`gemini-3.6-flash`)
- 投稿画像はNeonにファイルストレージが無いため、DBにbytea（バイナリ）として直接保存
- データ取得はSWR（useEffect+fetchの直書きは避ける方針。CODE_ANTI_PATTERNS.md AP-A1準拠）

## 実装済み機能（実データでE2E確認済み）
- アカウント管理（複数登録・選択）
- 投稿登録（URL/テキスト/画像の複数投入・一括投入、AI解析、確信度によるレビュー要否判定）
- 商品名の名寄せ（表記ゆれ統合UI・マージAPI）、重複投稿検知（URL一致・内容ハッシュ一致）
- 日別横断参照、アカウント別まとめ（販売⇔買取比較・スプレッド表示）
- 商品別の価格推移グラフ・店舗ランキング
- CSVエクスポート、画像の保存・配信（/api/images/[id]）
- Xブックマークレット（単一投稿の取り込みに加え、タイムラインからの一括取り込み・レビュー画面）
- scripts/guard.mjs をこのアプリ向けに書き換え、self-testで実際に検知することを確認済み

## デプロイ状態
- Neonプロジェクト作成・マイグレーション実行済み（0001〜0006。0004でusers/owner_user_id/
  is_shared を削除しマルチユーザー機能を撤廃、0005でaccounts.url追加、0006でscrape_batches
  （ブックマークレット一括取り込みの一時テーブル）追加）
- Vercelプロジェクト `torekakaitori` に環境変数（DATABASE_URL/GEMINI_API_KEY/GEMINI_MODEL）設定済み。
  BASIC_AUTH_PASSWORD/BASIC_AUTH_USER はコード側で参照しなくなったため、Vercel側の環境変数
  設定も不要になった（残っていても無害だが、整理するなら削除してよい）
- Framework PresetをNext.jsへ修正済み（Otherのままだと本番が404になっていた。INC-071）
- Basic認証は2026-09-01にユーザーの指示で完全撤廃（src/proxy.ts削除）。本番URLは無認証で
  誰でもアクセス可能な状態であることを確認済み
- GitHub push → Vercel自動デプロイの一連の流れを確認済み

## 次のアクション（ユーザー側の作業）
実際に追いたい店舗のXアカウントを「アカウント管理」から登録し、投稿の手動投入を開始する。
本番URLは認証なしでそのまま開ける（Basic認証ダイアログは表示されない）。

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
- 本番URLは無認証（誰でもアクセス可能）。ユーザーの明示的な指示による仕様であり不具合ではない。
  再度保護が必要になった場合はsrc/proxy.tsによるBasic認証を復活させ、guard.mjsのINC-035除外も
  元に戻すこと
- ブックマークレットの一括取り込みは、実際のXページ上でのDOM読み取り部分（bookmarklet/page.tsx
  内のスクリプト）を実機ブラウザでは未検証（この開発環境にヘッドレスブラウザが無いため）。
  バックエンド側（/api/scrape-import・/api/fetch-image・/post/bulk）はcurlでの手動検証のみ実施済み。
  実際にXのタイムラインで動くかは、ユーザーによる初回利用時の確認が必要
