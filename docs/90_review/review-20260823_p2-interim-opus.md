---
doc_id: REV-005
status: fixed
updated: 2026-08-23
---

# レビュー(2026-08-23)

対象:
- `docs/20_basic-design/system-architecture.md`(BD-001)
- `docs/20_basic-design/screen-design.md`(BD-002)
- `docs/20_basic-design/api-spec.yaml`(BD-003)
- `docs/20_basic-design/er-diagram.md`(BD-004)
- `docs/20_basic-design/table-definition.md`(BD-005)
- `docs/20_basic-design/nonfunctional-design.md`(BD-006)

参照した前提文書: `docs/10_requirements/requirements.md`(REQ-001) / `docs/10_requirements/use-cases.md`(REQ-002) / `docs/00_project/charter.md`(PRJ-001) / `docs/00_project/decisions/002-realtime-judgment-frontend.md`(ADR-002) / `docs/00_project/change-log.md`(CL-001) / `docs/_index.md`(IDX-001)

完了条件(workflow.md P2): 画面・API・テーブルの3点が相互整合し、各項目が FR-ID までトレースできる状態

---

## 重要度A(必須)

### A1. お題取得の API パスが BD-001 と BD-003 で食い違っている

- 対象ファイル・箇所:
  - `system-architecture.md` 5章 データフロー 1「お題取得(FR-01, FR-13): フロントエンド → `GET /api/topics?difficulty=...` → Repository → DB」
  - `api-spec.yaml` paths: `/api/topic-sets`(GET, FR-13)、`/api/topic-sets/{topicSetId}/sentences`(GET, FR-01/FR-13)
- 指摘内容: BD-001 が書いている `GET /api/topics?difficulty=...` は BD-003 に存在しない。BD-003 では「セット一覧取得」と「セット配下のお題文一括取得」の**2本**に分かれており、パラメータも `difficulty`(クエリ)ではなく `topicSetId`(パス)である。BD-001 5章の他のステップ(`POST /api/users`、`POST /api/sessions`)は BD-003 と一致しているため、ここだけが P2-04 前の旧案のまま残っている。さらに BD-001 7章は「API パスは api-spec.yaml で解決済み」と宣言しているので、文書内でも自己矛盾している。完了条件「画面・API・テーブルの3点が相互整合」に直接抵触する。
- 推奨対応: `system-architecture.md` 5章 のステップ1を、BD-003 の実際のパスに合わせて2ステップ(お題セット一覧取得 → 選択したセットのお題文一括取得)へ書き換える。あわせて BD-001 5章の全ステップを BD-003 の `operationId` と1対1で突き合わせ、以後どちらかを直したら他方も直す旨を注記する。

### A2. FR-06 の算出主体が BD-005 だけ「フロントエンド」になっており、BD-001 / BD-003 / ADR-002 と矛盾する

- 対象ファイル・箇所: `table-definition.md` TBL-04 直下の補足「フロントエンドが算出した `net_kpm`・`raw_kpm`・`accuracy` の最終値をバックエンドがそのまま受け取り保存する」
- 指摘内容: 他の文書はすべて**バックエンド(typing-core)が算出する**としている。
  - `system-architecture.md` 3章「バックエンド ロジック / typing-core(純粋 Java) / セッション結果の集計計算(Net/Raw KPM・正確率・Consistency) / FR-06」
  - `system-architecture.md` 5章 ステップ3「typing-core が Net/Raw KPM・正確率・Consistency を算出」
  - `api-spec.yaml` `POST /api/sessions` description「バックエンド(typing-core)が Net/Raw KPM・正確率・Consistency を算出して保存する」、リクエストが確定値ではなく `correctKeyCount` / `durationSeconds` / `keystrokeIntervalsMs` という**素材**である点も算出=バックエンドを裏づける
  - `ADR-002` 決定「`typing-core`(Java)は、セッション終了後の集計計算(Net/Raw KPM・正確率・Consistency、FR-06)を担う」

  これは「P5 で typing-core に何を実装するか」を左右する明確な矛盾であり、実装者が BD-005 だけを読むと typing-core が空モジュールになる。加えて当該一文は「打鍵の生ログはリクエスト時の計算にのみ使い」と続いており、**同じ文の中で算出主体が入れ替わっている**(文書内矛盾)。さらに列挙から `consistency` が抜けている。
- 推奨対応: TBL-04 の補足を「フロントエンドは正誤ログ(`correctKeyCount` / `durationSeconds` / `keystrokeIntervalsMs` / ミス記録 / かな出現回数)を送信し、バックエンドの typing-core が Net/Raw KPM・正確率・Consistency を算出して本テーブルに保存する。打鍵の生ログ・正しく確定したキー入力数自体は永続化しない」に全面的に書き換える。あわせて末尾の「詳細は P2-04 `api-spec.yaml` で確定」は既に確定済みなのでリンク付きの参照(`./api-spec.yaml`)に直す。

### A3. `kana_occurrence_no` の定義が二通りに読め、FR-10(1) の「ミス回数」の単位が API に定義されていない

- 対象ファイル・箇所:
  - `table-definition.md` TBL-05 `kana_occurrence_no`「セッション内でそのかなが何拍目の出現かの通し番号」
  - `api-spec.yaml` `MissRecordInput.kanaOccurrenceNo`(同文)
  - `er-diagram.md` 3.1「分析時に `COUNT(DISTINCT kana_occurrence_no)` で『拍1回のミス』として数え直せる」
  - `api-spec.yaml` `MissAnalysis.byKana.missCount` / `missRate`(単位の記述なし)
- 指摘内容: 3点が一意に解釈できない。
  1. **定義の二義性**: 「そのかなが何拍目の出現か」は、(a) そのかな固有の出現連番(「し」の3回目 → 3)とも、(b) セッション全体の拍位置の通し番号(セッションの17拍目 → 17)とも読める。どちらを採るかで一意化キーが `(session_id, kana, kana_occurrence_no)` と `(session_id, kana_occurrence_no)` に変わる。
  2. **集約式が期間をまたぐと誤る**: `er-diagram.md` 3.1 の `COUNT(DISTINCT kana_occurrence_no)` は単一セッション内でしか成立しない。`api-spec.yaml` の `getMissAnalysis` は「全期間・全難易度」を集計対象と明記しているので、複数セッションの同じ番号が1つに潰れ、ミス回数を**過少計上**する。`session_id` を含めた複合での DISTINCT が必要。
  3. **API に単位が書かれていない**: `screen-design.md` S-06 は「かな1拍別のミス回数」(=拍単位)、`table-definition.md` TBL-05 は「1回の誤入力 = 1行」(=キー単位)。両者を橋渡しする `MissAnalysis.byKana.missCount` がどちらの単位かを述べていない。`missRate` の分母が `session_kana_counts.total_count`(拍単位)である以上、分子も拍単位でなければ率が1を超えうるが、そのことがどの文書にも書かれていない。

  これは「画面・API・テーブルの3点が相互整合」の中核(FR-10 の主要成果物)で解釈が割れる状態であり、P3 の SQL 詳細に送れる粒度を超えている。
- 推奨対応:
  - TBL-05 / `api-spec.yaml` で `kana_occurrence_no` の定義文を、上記 (a)(b) のどちらか一方に読める文へ書き直す(例: (b) を採るなら「セッション内の全かな1拍に先頭から振る通し番号。かなの種類によらず連番」)。
  - `er-diagram.md` 3.1 の集約式を、セッションをまたぐ集計を前提に `COUNT(DISTINCT (session_id, kana_occurrence_no))` 相当へ訂正する。
  - `api-spec.yaml` の `byKana.missCount` に「かな1拍単位(同一拍での複数回ミスは1と数える)」、`missRate` に「= 拍単位ミス数 ÷ `session_kana_counts.total_count` の総和」と description を追記する。`byCharType.accuracyRate`、`byPrevKana.missRate` も同様に分子・分母を明記する。

---

## 重要度B(推奨)

### B1. `POST /api/sessions` が FR-05 をトレース先に挙げているが、終了条件を表す項目がリクエストにもテーブルにも存在しない

- 対象ファイル・箇所: `api-spec.yaml` `submitSession` description「FR-04, FR-05, FR-06, FR-07」/ `SessionSubmission` スキーマ / `table-definition.md` TBL-04
- 指摘内容: FR-05 は「お題 N 文完了 / 制限時間経過」のどちらの条件でセッションが終わったかを判定する要件で、`screen-design.md` S-02 でも利用者が選択する入力項目になっている。しかし `SessionSubmission` にはモード(お題数/制限時間)も設定値(N や秒数)も無く、TBL-04 にも列がない。結果として、API に貼られた FR-05 のタグが実体を伴っていない(逆トレースすると空になる)。また `SessionSummary` / 履歴一覧からは、同じ難易度の「3文モード」と「60秒モード」の記録を区別できない。FR-08 の受け入れ条件(日時・KPM・正確率・所要時間)自体は満たすため A ではないが、後から追加すると DB マイグレーションが要る種類の欠落である。
- 推奨対応: いずれかを選んで明記する。(1) TBL-04 に `end_condition_type` / `end_condition_value` を追加し `SessionSubmission` にも載せる、(2) 追加しないと決めるなら、`table-definition.md` TBL-04 か `api-spec.yaml` に「終了条件はフロントエンドのセッション制御にのみ使い永続化しない(FR-05 の実現はフロントエンド完結)」と明記し、`submitSession` の FR-05 タグを外す。

### B2. 数値項目の単位・値域がどの文書にも定義されていない

- 対象ファイル・箇所: `table-definition.md` TBL-04 `accuracy NUMERIC(5,2) 正確率(%)` / `consistency NUMERIC(8,2)` / `api-spec.yaml` `SessionResult.accuracy`・`PersonalBest.accuracyBest`・`MissAnalysis.*.missRate` / `accuracyRate`
- 指摘内容: DB は正確率を「%」(0〜100)と定義しているのに、API 側の `accuracy` は `type: number` のみで単位の記述がなく、0〜1 と実装される余地がある。画面(S-04・S-05)にも表記の指定がない。`missRate` / `accuracyRate` は単位も分母もどこにも定義がない。`consistency` は `NUMERIC(8,2)` と桁だけ先に決まっているが、統計量(標準偏差[ms] か変動係数か)が P3 未決のため、桁が妥当かを判断できる根拠が無い。
- 推奨対応: `api-spec.yaml` の各フィールド description に単位(%か比率か)を明記し、TBL-04 と揃える。`consistency` は P3 で統計量が決まるまで桁を暫定としてその旨を TBL-04 の未決事項に落とす。

### B3. 利用者情報(userId)の保持方法が未定義で、画面遷移条件が実装できない

- 対象ファイル・箇所: `screen-design.md` 2章「名前が未入力(初回起動、または**保持している名前が空**)の場合のみ S-01 を経由する」/ `api-spec.yaml` の `/api/users/{userId}/...` 系3本
- 指摘内容: 履歴・自己ベスト・ミス分析・セッション送信のすべてが `userId` を必要とするのに、`POST /api/users` で得た `userId`(および名前)をどこにどう保持するかがどの文書にも書かれていない。「保持している名前」という表現だけがあり、保持先(localStorage / Pinia のみ = リロードで消える)が決まらないと、S-01 を経由するか否かという**画面遷移の分岐条件が実装できない**。ブラウザを閉じた後の挙動も一意に決まらない。
- 推奨対応: `screen-design.md` 2章に保持方式(例: `userId` と名前を localStorage に保存し、起動時に読み出す。無ければ S-01)を1行で確定する。ストアの構造そのものは P3 送りでよい。

### B4. P2 で確定した内容が上流文書(REQ-001 / REQ-002 / PRJ-001)に反映されておらず、change-log にも記録がない

- 対象ファイル・箇所:
  - `use-cases.md` 4章 未決事項「ミス記録の保存粒度(セッション単位の集計のみか、1ミスごとにイベントとして残すか) — テーブル設計(P2)に影響」が未更新
  - `requirements.md` FR-04 表の「未決事項」行が「P2 テーブル設計で確定する」のまま残存(5章のリストだけが解決済みに更新されている)
  - `requirements.md` FR-06 未決事項「上記の正確率定義は FR-04 のミス記録粒度が確定した時点で再確認する」に対し、`api-spec.yaml` が「総キー入力数 = `correctKeyCount + missRecords.length`(requirements.md FR-06 未決事項への回答)」と**設計書側で回答している**が、REQ-001 側に反映されていない
  - `charter.md` 3.3 規模感「テーブル 4〜5(`users` / `sentences` / `typing_sessions` / `session_results` / ミス記録用テーブル(暫定、P2 で確定))、API 6〜8 本、画面 4〜5」が旧テーブル名・旧件数のまま(実際は 6 テーブル / 7 API / 6 画面)。charter 自身が「確定は P2 基本設計で行う」と書いている
  - `change-log.md` には CL-001 しかなく、上記の確定・変更が1件も記録されていない(`charter.md` 3.2 の「2026-08-23 追記(P2-03)」すら未記録)
- 指摘内容: いずれも `status: fixed` の上流文書に対する変更・確定であり、CLAUDE.md と change-log.md の運用ルール(「確定済みの成果物を変更した記録を残す」)に照らすと記録漏れ。特に「設計書が要件の未決事項に回答しているのに要件側が未更新」の状態は、REQ-001 を正とみなす後工程(P4 テスト設計)で判断が割れる。
- 推奨対応: (1) REQ-002 4章・REQ-001 FR-04/FR-06 の未決事項を解決済み表記に更新、(2) PRJ-001 3.3 を確定値(6テーブル / 7API / 6画面、テーブル名は `sessions` / `miss_records` / `session_kana_counts`)へ更新、(3) 上記3件を `change-log.md` に CL-002 以降として記録する。

### B5. NFR-09 が対象に挙げる FR-01(お題取得失敗)の異常系が、API 定義にも画面設計にも落ちていない

- 対象ファイル・箇所: `requirements.md` NFR-09(対応FR: FR-01, FR-07)/ `api-spec.yaml` の GET 系4本(5xx レスポンス未定義)/ `screen-design.md` 3章(S-02・S-05・S-06 にエラー表示の記載なし)
- 指摘内容: `nonfunctional-design.md` NFR-09 の「方針の一般化」で「一様に 5xx を返し、フロントエンドは汎用エラー表示に切り替える」と方針は書かれているが、`api-spec.yaml` では `POST /api/sessions` にしか 500 が定義されておらず、`screen-design.md` でエラー表示に言及しているのも S-04 だけである。NFR-09 が明示的に FR-01 を挙げている以上、お題取得の失敗時挙動は画面側にも根拠が要る。
- 推奨対応: `api-spec.yaml` の GET 系にも `"500": 汎用エラー(NFR-09)` を追加するか、`components.responses` に共通定義を置いて参照する。`screen-design.md` 3章の各画面「備考」に「データ取得失敗時は汎用エラー表示(nonfunctional-design.md NFR-09)」を1行追加する。

### B6. ミス記録0件時の空状態が、FR-10(4) 文字種別正解率にとって過剰に働く

- 対象ファイル・箇所: `screen-design.md` 4章「S-06: ミス記録が0件の場合、**4種の集計セクションはすべて**『分析にはある程度の練習記録が必要です』を表示する」/ `api-spec.yaml` `getMissAnalysis` description「ミス記録が0件の場合、4種の集計はすべて空配列」
- 指摘内容: FR-10(4) の文字種別正解率は分母が `session_kana_counts` なので、ミスが0件でもセッションさえあれば「正解率100%」として正しく算出できる。同じ4章に「『0件』と『値が0』は区別する」と書いてあるにもかかわらず、ミス記録0件を「セクション自体が出せない」扱いにしているのは、自ら立てた原則と整合しない。セッション自体が0件のとき(=分母も0)と、セッションはあるがミスが0件のときが同一視されている。
- 推奨対応: 空状態の判定条件を「セッションが0件のとき」に改める。あるいは、FR-10(1)(2)(3) はミス記録0件で空表示、FR-10(4) はセッションが1件以上あれば算出、と観点ごとに条件を分けて 4章の表に書く。

---

## 重要度C(参考)

### C1. `getPersonalBest` の summary と実際のレスポンスが噛み合っていない

- 対象ファイル・箇所: `api-spec.yaml` `getPersonalBest` description「**難易度ごとに** KPM 最大・正確率最大を返す」
- 指摘内容: `topicSetId` が必須クエリで、返却は単一の `PersonalBest`。「難易度ごとに(複数返す)」とも読める表現になっている。
- 推奨対応: 「指定された難易度の KPM 最大・正確率最大を返す(難易度をまたいだ集計は行わない。FR-09)」に直す。

### C2. `SessionSummary.topicSetName` が画面設計の表示項目に無い

- 対象ファイル・箇所: `api-spec.yaml` `SessionSummary.topicSetName` / `screen-design.md` S-05 履歴一覧「日時・KPM・正確率・所要時間で一覧表示」
- 指摘内容: API が返すのに画面が使わない項目。FR-09 が「異なる難易度の結果を混在させて比較しない」としている以上、履歴一覧にも難易度列があるほうが自然。
- 推奨対応: S-05 の表示項目に「難易度」を足すか、`topicSetName` を落とす。どちらでも構わないが揃える。

### C3. `POST /api/users` の新規作成時レスポンスが 200

- 対象ファイル・箇所: `api-spec.yaml` `identifyUser` responses
- 指摘内容: find-or-create のため 200 固定は実用上問題ないが、`POST /api/sessions` は 201 を返しており、同じ POST で新規作成の扱いが揃っていない。
- 推奨対応: 200 のままにするなら「find-or-create のため作成時も 200 を返す」と description に一言添える。

### C4. 「テーブルを持たない FR」の明示がない

- 対象ファイル・箇所: `table-definition.md` 全体
- 指摘内容: 各テーブルに対応FRは付いているが、逆方向(FR → テーブル)の確認ができない。FR-02・FR-03・FR-05・FR-11 は意図的に永続化対象を持たない(フロント完結 / 都度生成)が、その旨がどこにも書かれていないため、レビュー時に「漏れ」と「意図的な非該当」が区別できない。
- 推奨対応: `table-definition.md` の冒頭か末尾に FR-01〜FR-13 × TBL-ID の対応表を1つ置き、非該当の FR には理由を1行で付ける。P4 のトレーサビリティマトリクス(TST-005)作成が楽になる。

### C5. `nonfunctional-design.md` の「B1対応」節は設計書の内容ではない

- 対象ファイル・箇所: `nonfunctional-design.md` 末尾「B1対応: リスク対策表への追加指標の反映」
- 指摘内容: charter.md を更新したという**作業記録**であり、非機能の実現方式ではない。同種の記録は `change-log.md` かレビュー票のクローズ欄に置くのが運用ルールと整合する(B4 とも関係)。
- 推奨対応: `change-log.md` へ移すか、レビュー票側のクローズ記録に留める。

### C6. `table-definition.md` に P2-04 前の前方参照が残っている

- 対象ファイル・箇所: TBL-04 補足「詳細は P2-04 `api-spec.yaml` で確定」
- 指摘内容: 既に確定済み。BD-001・BD-002 は「→ 解決済み」に更新されているのに、BD-005 だけ未更新。
- 推奨対応: A2 の修正時にあわせて `./api-spec.yaml` へのリンクに直す。

### C7(申し送り). 履歴取得に件数上限・ページングが無い

- 対象ファイル・箇所: `api-spec.yaml` `listSessionHistory`
- 指摘内容: 個人利用のため MVP では問題にならないが、セッションが数百件を超えると NFR-02(体感2秒)に効く可能性がある。今 P2 で対処する必要はない。
- 推奨対応: P3 `db-access.md` の検討事項として1行残す。

### C8(申し送り). BD-007 `deployment.md` が未着手

- 対象ファイル・箇所: `docs/_index.md` 20_basic-design 表
- 指摘内容: 今回の完了条件(画面・API・テーブルの相互整合)には含まれないため本レビューではブロッカーにしない。P2.5(Walking Skeleton、charter 6章のリスク対策)着手前には必要になる。
- 推奨対応: P2.5 のタスクとして `progress.md` / WBS 側に紐づけておく。

---

## 観点別の総括

**1. トレーサビリティ**: FR-01〜FR-13 の全 13 件が画面(S-01〜S-06)・API・テーブル(TBL-01〜TBL-06)のいずれかに到達しており、UC-00〜UC-07 も `screen-design.md` 1章で全件が画面に割り当てられている(UC-07 が独立画面を持たない理由も明記済みで妥当)。NFR-01〜NFR-09 も `nonfunctional-design.md` で全件が実現方式まで具体化されており、空欄・TBD 残りはない。存在しない ID への参照も見当たらない。ただし A3(FR-10 の集計単位が API で未定義)と B1(FR-05 のタグに実体がない)の2点で、タグは付いていても実体に届いていない箇所がある。

**2. charter.md との整合性**: MVP スコープ 3.1 の #1〜#8 はいずれも設計に落ちている(#1→FR-01/02 + S-03 + TBL-03、#2→S-02 の終了条件選択(ただし B1)、#3→S-03、#4→FR-06 + `SessionResult`、#5→TBL-04、#6→S-05 + 履歴/自己ベスト API、#7→TBL-02 + `/api/topic-sets`、#8→S-06 + `MissAnalysis` + TBL-05/06)。3.2 のスコープ外リスト(認証・ランキング・お題投稿 UI・WebSocket・英語モード・かな入力・モバイル対応・テーマ切替・エクスポート・自動お題生成・自由入力モード)と矛盾する記述は API・画面・テーブルのいずれにも混入していない。TBL-03 に「シードデータとして開発者が投入する(charter.md 3.2「お題投稿」はスコープ外)」と明記されている点は良い。一方で 3.3 規模感が旧値のまま(B4)。

**3. 内部矛盾・曖昧さ**: 最も問題が集中した観点。A1(API パス)・A2(FR-06 の算出主体)は明確な矛盾、A3(`kana_occurrence_no` の定義と集計単位)は一意に解釈できない記述。B2(単位未定義)・B3(userId 保持方法)・B6(空状態の条件)も実装者が判断を迫られる箇所。用語については、「かな1拍」「ローマ字1キー」の粒度が REQ-001/REQ-002 0章の定義どおり P2 文書でも一貫して使われており、「お題セット(難易度)」の言い換えも `topic_sets` に統一されている点は良好。

**4. 完了条件の充足**: 「画面・API・テーブルの3点が相互整合し、各項目が FR-ID までトレースできる状態」は**未達**。相互整合の面で A1(BD-001↔BD-003)、A2(BD-005↔BD-001/BD-003)、A3(BD-002↔BD-003↔BD-005)の3件が残っている。逆に言えば、この3件を潰せば完了条件は満たせる見込みで、6文書とも空セクション・TBD 放置は無い。未決事項が明示的に P3/P5 へ送られている(インデックス設計、Flyway 分割、フロントのフォルダ構成、Consistency の統計量)点は、送り先の工程まで書かれており適切。

**5. 過剰・スコープ超過**: 問題なし。`session_kana_counts`(TBL-06)の追加はテーブル数を charter 3.3 の暫定値より1つ増やすが、`er-diagram.md` 3.2 に「FR-10 のミス率・正解率の分母がないと算出できない」「分母をバックエンドで再計算すると ADR-002 と矛盾する」という必要性の説明があり、正当。3.3 で FR-10(3) の分母を近似で済ませる判断、`keystrokeIntervalsMs` を永続化しない判断、NFR-03/07/08 で監視基盤・リストア訓練を持たない判断は、いずれも charter 6章の完走優先方針と整合している。ビジュアルデザインを P2 の対象外と明示した `screen-design.md` 5章も適切な線引き。
