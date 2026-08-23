---
doc_id: REV-004
status: fixed
updated: 2026-08-23
---

# レビュー(2026-08-23)

対象: `docs/20_basic-design/system-architecture.md`(BD-001), `docs/20_basic-design/screen-design.md`(BD-002), `docs/20_basic-design/api-spec.yaml`(BD-003), `docs/20_basic-design/er-diagram.md`(BD-004), `docs/20_basic-design/table-definition.md`(BD-005), `docs/20_basic-design/nonfunctional-design.md`(BD-006)

## 対応状況(2026-08-23 追記)

| 指摘 | 対応 |
|---|---|
| A1 FR-12がsystem-architecture.mdから欠落 | クローズ。3章の表・5章データフローに追記 |
| B1 TBL-04の対応FRにFR-08が抜けている | クローズ。table-definition.mdに追記 |
| B2 `/api/sessions`のdescriptionにFR-04が抜けている | クローズ。api-spec.yamlに追記 |
| B3 `keystrokeIntervalsMs`がrequiredでない | クローズ。requiredに追加 |
| B4 総キー入力数の導出方法が未記載 | クローズ。api-spec.yamlのdescriptionに追記 |
| B5 未決事項が解決済み項目を指したまま | クローズ。system-architecture.md/screen-design.mdに取り消し線+解決先リンクを追記 |
| B6 自己ベスト表記の揺れ(KPM最大→Net KPM最大) | クローズ。screen-design.mdを修正 |
| C1〜C3 | 未対応。指摘どおりP3以降へ先送り |

重要度A・Bは全件クローズ。C1〜C3はP3以降へ先送り(指摘の推奨対応どおり)。

P2 基本設計(ゲート②前)の中間レビュー。前提として `docs/10_requirements/requirements.md`(REQ-001)、`docs/10_requirements/use-cases.md`(REQ-002)、`docs/00_project/charter.md`(PRJ-001)、`docs/00_project/decisions/002-realtime-judgment-frontend.md`(ADR-002)、`docs/00_project/change-log.md`(CL-001)を参照した。workflow.md の P2 完了条件「画面・API・テーブルの3点が相互整合し、各項目がFR-IDまでトレースできる状態」を基準に判定した。

## 重要度A(必須)

### A1. system-architecture.md の FR-ID対応表に FR-12 が一度も出現しない

- 対象ファイル・箇所: `docs/20_basic-design/system-architecture.md` 3章「レイヤ構成と責務(FR-ID対応)」表(35〜42行目)、5章「データフロー」(57〜62行目)
- 指摘内容: 3章の表はフロントエンド(画面表示・状態管理)/フロントエンド(TS判定エンジン)/バックエンドAPI Controller/バックエンド永続化の4行すべてに「対応FR」列があるが、いずれの行にも FR-12(利用者を識別する)が挙がっていない。DB行だけが「全FRの永続化対象」という包括表現で辛うじてカバーしているに過ぎない。5章のデータフローも「お題取得」「タイピング中」「セッション終了」「履歴・自己ベスト・ミス分析」の4フローのみで、名前入力・利用者識別(UC-00 / FR-12、`POST /api/users`)に対応するフローが存在しない。screen-design.md(S-01, FR-12)・api-spec.yaml(`/api/users`, FR-12 明記)・table-definition.md(TBL-01, 対応FR: FR-12)では正しくカバーされているため、システム全体としてFR-12が実装対象から漏れているわけではないが、本文書は表題自体が「FR-ID対応」であり、これを見た実装者はFR-12がどのレイヤの責務か、どのデータフローで実現されるかを読み取れない
- 推奨対応: 3章の表に FR-12 の行(または既存のControllerAPI/永続化行への追記)を追加し、5章のデータフローにも「0. 利用者識別(FR-12): フロントエンド → `POST /api/users` → find-or-create → Repository → DB」相当のステップを追加する

## 重要度B(推奨)

### B1. table-definition.md TBL-04 の「対応FR」欄に FR-08 が抜けている

- 対象ファイル・箇所: `docs/20_basic-design/table-definition.md` TBL-04(45〜59行目)。ヘッダー「対応FR: FR-06, FR-07, FR-09」(47行目)と、`played_at` カラムの説明「FR-08 の一覧ソートに使う」(59行目)
- 指摘内容: カラムレベルの注記では `played_at` が FR-08(練習履歴一覧表示)に使われると明記されているのに、テーブル冒頭の「対応FR」一覧には FR-08 が含まれていない。同じテーブル内で参照粒度が食い違っており、トレーサビリティマトリクス作成時(P4)に見落としの原因になりうる
- 推奨対応: TBL-04 の「対応FR」を `FR-06, FR-07, FR-08, FR-09` に修正する

### B2. api-spec.yaml `POST /api/sessions` の description に FR-04 が明記されていない

- 対象ファイル・箇所: `docs/20_basic-design/api-spec.yaml` 81〜104行目(`/api/sessions` post)
- 指摘内容: このエンドポイントはリクエストボディに `missRecords`(`MissRecordInput`、FR-04 のミス記録データそのもの)を含み、実質的に FR-04 の永続化を担っているが、description は「FR-05, FR-06, FR-07。」とのみ書かれており FR-04 が抜けている。table-definition.md の TBL-05(ミス記録テーブル)は対応FRに FR-04 を明記しているため、API側とテーブル側でFR-04の扱いに温度差がある
- 推奨対応: description の対応FRリストに FR-04 を追加する

### B3. `SessionSubmission.required` に `keystrokeIntervalsMs` が含まれておらず、TBL-04 の `consistency` NOT NULL 制約との整合が取れていない

- 対象ファイル・箇所: `docs/20_basic-design/api-spec.yaml` 247〜274行目(`SessionSubmission` スキーマ、特に `required` 配列 249行目)、`docs/20_basic-design/table-definition.md` TBL-04 `consistency` カラム(57行目、NOT NULL)
- 指摘内容: Consistency(打鍵間隔のばらつき)の算出には `keystrokeIntervalsMs` が必須のはずだが、`SessionSubmission` の `required: [userId, topicSetId, correctKeyCount, durationSeconds, missRecords, kanaCounts]` にこのフィールドが含まれておらず、OpenAPI上は省略可能になっている。省略された場合、バックエンドが `consistency`(NOT NULL)にどの値を入れるかが未定義
- 推奨対応: `keystrokeIntervalsMs` を `required` に追加するか、省略時の挙動(デフォルト値・バリデーションエラー等)を description に明記する

### B4. 「総キー入力数(ミス含む)」の導出方法が API 仕様上どこにも明文化されていない

- 対象ファイル・箇所: `docs/20_basic-design/api-spec.yaml` `correctKeyCount` の説明(259行目「総正しい確定キー入力数(FR-06 の Net KPM・正確率の分子)」)、`docs/10_requirements/requirements.md` FR-06 未決事項(70行目「上記の正確率定義は FR-04 のミス記録粒度(P2 テーブル設計)が確定した時点で再確認する」)
- 指摘内容: FR-06 の正確率・Raw KPM は分母に「総キー入力数(ミス含む)」を要求するが、`SessionSubmission` にはそれに相当するフィールドが独立して存在しない。おそらく `correctKeyCount + missRecords.length` で算出する設計意図と推測できるが、api-spec.yaml のどこにもこの導出関係は書かれていない。また requirements.md FR-06 が「P2 テーブル設計確定後に正確率定義を再確認する」としていた宿題への回答が、P2 のいずれの文書にも見当たらない(table-definition.md TBL-04 の注記は「保存しない」という保存方針のみで、算出方法には触れていない)
- 推奨対応: `SessionSubmission` の `correctKeyCount` 説明に「総キー入力数は `correctKeyCount + missRecords.length` として算出する」旨を一言追記するか、`POST /api/sessions` の description に一文追加する。厳密な数式自体は FR-06 未決事項どおり P3 に送ってよいが、「分母となる生データがどこから来るか」は P2 の API 契約の範囲であり明文化すべき

### B5. system-architecture.md / screen-design.md の「未決事項」が、既に完了した P2-03/P2-04 を指したまま更新されていない

- 対象ファイル・箇所: `docs/20_basic-design/system-architecture.md` 7章(78〜81行目)、`docs/20_basic-design/screen-design.md` 5章(117〜120行目)
- 指摘内容: system-architecture.md 7章は「API パス・リクエスト/レスポンス形式は P2-04(`api-spec.yaml`)で確定する」「テーブル構造・ミス記録の保存粒度は P2-03(`er-diagram.md`/`table-definition.md`)で確定する」としているが、api-spec.yaml・er-diagram.md・table-definition.md は本レビュー対象として既に作成済みであり、これらの未決事項は実質的に解決済みである。同様に screen-design.md 5章の「API のリクエスト/レスポンス形式は P2-04 で確定する」も同じ理由で陳腐化している。requirements.md 5章では解決済み項目に取り消し線+解決先リンクを付ける運用(例: 227行目)が既にあるため、同じ運用をP2文書側でも踏襲すべき
- 推奨対応: 両文書の該当項目を「解決済み」として取り消し線を引くか削除し、必要なら「未決事項」欄には本当に P3 以降に残る事項のみを残す

### B6. 自己ベストの指標表記が画面間で揺れている(「KPM最大」 vs 「Net KPM最大」)

- 対象ファイル・箇所: `docs/20_basic-design/screen-design.md` S-05(88行目「選んだ難易度の KPM最大・正確率最大」)。比較: S-04(78行目「Net KPM・Raw KPM・正確率・Consistency・所要時間」)、`docs/20_basic-design/api-spec.yaml` `PersonalBest.netKpmBest`(326行目)、`docs/10_requirements/requirements.md` FR-09(93行目「指標ごとの最良値(Net KPM 最大・正確率最大)」)
- 指摘内容: 自己ベストの指標は要件・APIともに一貫して「Net KPM」であるが、S-05 の表側だけ「KPM最大」と省略されており、S-04 で Net KPM と Raw KPM を並記している画面と同じ文書内で表記粒度が揃っていない。実害は小さいが、Raw KPM も自己ベストの対象と誤読される余地がある
- 推奨対応: S-05 の表記を「Net KPM最大・正確率最大」に統一する(軽微な修正で足りる)

## 重要度C(参考)

### C1. UC-05「直近プレイした難易度が既定で選ばれる」を実現する具体的な手段が未定

- 対象ファイル・箇所: `docs/10_requirements/use-cases.md` UC-05 基本フロー1(99行目)、`docs/20_basic-design/api-spec.yaml` `GET /api/users/{userId}/best`(`topicSetId` が必須クエリパラメータ、140〜145行目)
- 指摘内容: UC-05 は「直近プレイした難易度が既定で選ばれる」を想定しているが、`topicSetId` を必須とする現行API単体では「直近プレイした難易度」をどう取得するかが定義されていない(例えば `listSessionHistory` の先頭要素から推測する、フロントエンドの状態管理で保持する、等の手段が考えられるが明記なし)
- 推奨対応: P3 のシーケンス設計・クラス設計で解決すればよく、P2 時点でブロッカーにする必要はない

### C2. S-01(名前入力画面)から後続画面への `userId` の引き継ぎ方法が画面設計に明記されていない

- 対象ファイル・箇所: `docs/20_basic-design/screen-design.md` S-01(45〜52行目)
- 指摘内容: S-01 の遷移は「はじめる→S-02」とだけ書かれており、`POST /api/users`(api-spec.yaml)を呼ぶこと自体や、返却された `userId` をどう保持し以降の API 呼び出し(`/api/users/{userId}/...`)に使うかが画面設計上は読み取れない
- 推奨対応: P3 のシーケンス図で確定すればよい。P2 時点の指摘としては申し送り程度

### C3. NFR-09 の「一様に 5xx を返す」方針が nonfunctional-design.md にのみ記載され、api-spec.yaml の他エンドポイントには 5xx レスポンスが明示されていない

- 対象ファイル・箇所: `docs/20_basic-design/nonfunctional-design.md` NFR-09「方針の一般化」(53行目)、`docs/20_basic-design/api-spec.yaml`(`POST /api/sessions` のみ `"500"` レスポンスを明記。他の GET エンドポイントには 5xx の記載なし)
- 指摘内容: 方針としては「`POST /api/sessions` 以外も DB接続断時は一様に 5xx を返す」とされているが、OpenAPI のスキーマ上は `POST /api/sessions` にしか 500 レスポンスが定義されていない。実装上の振る舞いに影響はないが、API 仕様書だけを見た実装者には方針が伝わりにくい
- 推奨対応: 軽微。P3 または実装時に他エンドポイントにも `"5XX"` の共通レスポンスを追記すれば足りる

## 観点別の総括

- **トレーサビリティ**: FR-01〜FR-13・NFR-01〜09 は6文書全体ではほぼ全て反映されているが、system-architecture.md 単体の FR-ID対応表から FR-12 が完全に欠落している点をA1として指摘した。加えて TBL-04 の対応FR欄からFR-08が抜けている点(B1)、api-spec.yaml のFR-04記載漏れ(B2)など、文書間で参照粒度に細かなズレがある
- **charter.md との整合性**: 3.1 MVPスコープ(8項目)は6文書に漏れなく反映されている。3.2 のスコープ外項目(認証・ランキング・WebSocket対戦・英語モード・かな入力・モバイル対応・テーマ切替・SNS共有/エクスポート・苦手文字自動お題生成・自由入力別モード)を示すキーワードはP2文書中に一切出現せず、スコープ超過は確認されなかった
- **内部矛盾・曖昧さ**: ADR-002(リアルタイム判定はフロントエンド完結、typing-coreはP5時点で集計計算のみ)は system-architecture.md・api-spec.yaml・table-definition.md・er-diagram.md いずれにも矛盾なく反映されており、著者が懸念していた「バックエンドにオートマトンを持たせてしまう」類の記述は見つからなかった。一方で、Consistency算出に必要なデータの必須性(B3)や、正確率・Raw KPMの分母導出方法の明文化不足(B4)、自己ベスト指標の表記揺れ(B6)など、実装者が一意に解釈しづらい細部が残っている
- **完了条件の充足**: 画面(screen-design.md)⇔API(api-spec.yaml)⇔テーブル(table-definition.md)の3点は、表示項目・スキーマ・カラムの対応関係としては概ね整合しており、大きな欠落は見つからなかった。ただしA1(FR-12のシステム構成上の欠落)は「各項目がFR-IDまでトレースできる」という完了条件に照らし是正が必要。各文書の「未決事項」欄はTBDの空白放置こそないが、B5の指摘どおり一部が既に解決済みの内容を指したまま更新されておらず、実態と乖離している
- **B1/B2対応の確認**: P1指摘 B1(追加指標のリスク対策表反映)は charter.md 6章に明記済み、nonfunctional-design.md からも参照されており対応済みと確認できた。B2(自己ベスト・履歴0件時の挙動)は screen-design.md 4章で4画面分すべてに具体的な表示文言・遷移が定義されており、api-spec.yaml側もnull許容・空配列で応答することが明記され、画面とAPIの整合が取れている。いずれも十分な対応と判断する
- **過剰・スコープ超過**: 6章リスク方針(完走優先)に照らして、P2文書が過剰な作り込みに広がっている様子は見られなかった。フロントエンドのフォルダ構成やインデックス設計など、P2で決めるべきでない詳細は明示的にP3以降へ送られており(system-architecture.md 4章脚注、table-definition.md 未決事項)、判断は妥当
