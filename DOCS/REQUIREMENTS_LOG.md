📝 REQUIREMENTS_LOG.md — 要件記録・技術的負債・デモ・品質記録 v1.0（アプリ特化版）
参照前提：MINUTES.mdを読んだ状態を前提とする。
層：🔄 随時更新層（PMが変更）

▌変更履歴
バージョン  日付    変更内容                                        変更者
v1.0        初版    ビジネス版から分離・アプリ開発に特化して新規作成  秘書
v1.1        ★追加   外部ライブラリ管理・技術選定記録セクションを追加   秘書

▌このファイルの使い方
・要件の追加・削除・変更が発生したとき → 担当役割が即時記録
・技術的負債が発生したとき → 実装役割が即時記録
・デモ完了時 → 秘書が記録
・品質チェック完了時 → 秘書が記録
・BDRと連携：意思決定はBDRに記録し、ここはその索引として機能する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌要件種別の定義
  FN   ：機能要件（何ができるか）
  NFN  ：非機能要件（速度・セキュリティ・可用性）
  UX   ：UI/UX要件（見た目・操作感）
  API  ：外部連携要件
  INFRA：インフラ・デプロイ要件
  SEC  ：セキュリティ要件（認証・認可・データ保護）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌アクティブな要件（現在スコープ内）

<requirements_list>
  <requirement id="REQ-001" type="FN" priority="High" status="Active">
    <description>[要件内容]</description>
    <added_date>[YYYY-MM-DD]</added_date>
    <role>[担当役割]</role>
    <bdr_ref>[BDR-XXX]</bdr_ref>
  </requirement>
</requirements_list>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌技術的負債ログ

<technical_debt>
  <debt id="DEBT-001" impact="High" status="Unresolved">
    <description>[内容]</description>
    <reason>[暫定対応の理由]</reason>
    <remediation>[解消方法案]</remediation>
    <due_date>[YYYY-MM-DD]</due_date>
    <related_req>REQ-XXX</related_req>
  </debt>
</technical_debt>

⚠️ 影響度「High」の負債が未解消のままフェーズ移行する場合は
   PMがLv3（社長への確認）エスカレーションを実施する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌デモ・品質確認ログ

<verification_history>
  <demo id="DEMO-001" date="[YYYY-MM-DD]" result="Passed">
    <type>Manual/Auto</type>
    <target>[機能名]</target>
    <issues>[検出された問題 / なし]</issues>
  </demo>

  <quality_check id="QC-001" date="[YYYY-MM-DD]" status="Approved">
    <coverage>REQ-XXX, REQ-YYY</coverage>
    <security_check>Passed</security_check>
    <debt_check>No High Impact Debt</debt_check>
    <decision>Ready for Deployment</decision>
  </quality_check>
</verification_history>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌スクリプトプロパティ管理（GAS使用時）
トリガー：GASコードでスクリプトプロパティを使用したとき → 即時記録

| キー名          | 用途         | 設定状況    | 設定者  |
|----------------|------------|-----------|-------|
| [KEY_NAME]     | [何のキーか] | 設定済み/未設定 | 社長  |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌外部API・サービス管理
| サービス名 | 用途 | 認証方式 | 環境変数キー名 | 使用状況 |
|-----------|------|---------|-------------|--------|
| [名前]    | [用途] | APIキー等 | [KEY_NAME] | 使用中/未設定 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ ▌外部ライブラリ管理
トリガー：新規ライブラリを採用したとき → 即時記録

| LIB-ID  | ライブラリ名 | 用途 | バージョン | ライセンス | 採用日 | 採用者 |
|---------|-----------|------|---------|---------|--------|------|
| LIB-001 | [名前]    | [用途] | [ver]  | [MIT等] | [日付] | 社長 |

採用基準チェック（採用前に確認）：
  □ 週間DL数 10万以上 または GitHubスター 1,000以上
  □ 最終更新が1年以内
  □ ライセンスがMIT / Apache 2.0 / BSD のいずれか
  □ 既存ライブラリで代替できない

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ ▌技術選定記録
トリガー：技術スタック・ライブラリ・アーキテクチャを選定したとき → 即時記録
※ BDRは意思決定の記録・こちらは技術判断の根拠を残す専用セクション

| TECH-ID  | 対象技術   | 採用決定  | 検討した候補 | 選定日  |
|---------|-----------|---------|------------|--------|
| TECH-001 | [技術名] | [採用技術] | [候補A/B]  | [日付] |

技術選定記録フォーマット：
  【TECH-[連番]】[対象技術名]
  選定日：[YYYY-MM-DD]
  採用したもの：[技術・ライブラリ名]
  検討した候補：[候補A / 候補B]
  選定理由：[なぜこれにしたか]
  懸念点：[潜在的なリスク・将来の課題]
  参照BDR：[BDR-XXX]

REQUIREMENTS_LOG.md v1.1（アプリ特化版）— 🔄随時更新層。
要件変更・技術的負債・デモ・品質チェック・ライブラリ採用が発生するたびに即時記録する。
