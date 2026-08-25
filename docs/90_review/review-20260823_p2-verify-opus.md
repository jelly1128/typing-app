---
doc_id: REV-006
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

参照した前提文書: `docs/10_requirements/requirements.md`(REQ-001) / `docs/10_requirements/use-cases.md`(REQ-002) / `docs/00_project/charter.md`(PRJ-001) / `docs/00_project/decisions/002-realtime-judgment-frontend.md`(ADR-002) / `docs/00_project/decisions/003-userid-enumeration-accepted-risk.md`(ADR-003) / `docs/00_project/change-log.md`(PRJ-004) / `workflow.md`

判定基準: workflow.md P2 完了条件「画面・API・テーブルの3点が相互整合し、各項目が FR-ID までトレースできる状態」

## 重要度A(必須)

**該当なし(0件)。**

以下を機械的に突き合わせた結果、ゲートをブロックする欠陥は検出しなかった。

- FR-01〜FR-13 の全 13 件が、画面(S-01〜S-06)・API(7エンドポイント)・テーブル(TBL-01〜TBL-06)のいずれかに漏れなく割り当てられている。API を持たない FR-02/FR-03、テーブルを持たない FR-02/FR-03/FR-11 は、理由(ADR-002 / 都度生成)付きで明示的に「なし」と宣言されている
- UC-00〜UC-07 の全 8 件に対応画面がある(UC-07 は S-06 内セクションとする判断が根拠付きで書かれている)
- NFR-01〜NFR-09 の全 9 件が nonfunctional-design.md に実現方式付きで存在し、空セクション・TBD は無い
- 設計文書が参照する ID(FR-xx / NFR-xx / UC-xx / TBL-xx / S-xx / ADR-002 / ADR-003)に、実在しない参照先は無かった
- 主要データ項目の 画面 ⇄ API ⇄ テーブル の往復が成立している(例: S-05 履歴一覧の「日時・難易度・終了条件・KPM・正確率・所要時間」→ `SessionSummary` の `playedAt`/`topicSetName`/`endConditionType`+`endConditionValue`/`netKpm`/`accuracy`/`durationSeconds` → `sessions` の対応カラム)
- 正確率の定義(`correctKeyCount ÷ (correctKeyCount + missRecords.length)`)が requirements.md FR-06・api-spec.yaml で一致。ミス記録粒度(キー単位イベント + `kana_occurrence_no` による拍単位への集約)が requirements.md FR-04・use-cases.md 4章・er-diagram.md 3.1・table-definition.md TBL-05・api-spec.yaml `MissAnalysis.byKana` で一致
- P1 側の未決事項(FR-04 保存粒度 / FR-06 正確率定義 / use-cases.md 4章)が上流文書にも反映済みで、下流だけ更新されて上流が古いという状態になっていない(CL-003)

## 重要度B(推奨)

### B1. 文字種(char_type)の分類定義が無く、濁音・半濁音の帰属が一意に決まらない

- 対象ファイル・箇所: `table-definition.md` TBL-05 `char_type`(CHECK IN ('清音','拗音','撥音ん','促音っ','長音'))/ TBL-06 `char_type` / `api-spec.yaml` `MissRecordInput.charType`・`KanaCountInput.charType`・`MissAnalysis.byCharType.charType`
- 指摘内容: enum が5値に固定されているが、「が」「ざ」(濁音)・「ぱ」(半濁音)がどの値になるかがどの文書にも書かれていない。実装者は「清音」に寄せるか独自値を足すかを判断できず、フロントエンド(値を作る側)とバックエンド(CHECK で受ける側)で解釈がずれると `POST /api/sessions` が CHECK 制約違反で落ちる。これは FR-10(4)「文字種別正解率」の集計単位そのものの定義であり、P3 の実装詳細ではなく分類の定義の問題。加えて TBL-05 は CHECK 制約、api-spec は enum として値集合を**確定済みのものとして**書いているため、P3 で分類を詰めた結果 enum を増やすとテーブル定義とAPI仕様の両方の改版になる
- 推奨対応: table-definition.md TBL-05 に「濁音・半濁音は清音に含める」等の1行の帰属ルールを追記する(値集合を増やさない判断でよい)。増やす可能性を残すなら、TBL-05 未決事項に「文字種の値集合は P3 の分類確定まで暫定」と明記して CHECK 制約の再確認対象にする

### B2. 分母0・打鍵数不足時の算出結果が未定義(byCharType の 0 除算、consistency の NOT NULL)

- 対象ファイル・箇所: `api-spec.yaml` `MissAnalysis.byCharType.accuracyRate` の description / `screen-design.md` 4章 S-06 行 / `table-definition.md` TBL-04 `consistency NUMERIC(8,2) NOT NULL`
- 指摘内容: (1) `accuracyRate = (該当文字種の出現回数合計 − 拍単位ミス数) ÷ 該当文字種の出現回数合計` だが、そのセッション群に長音が1度も出現しなければ分母が 0 になる。一方 screen-design.md 4章 と api-spec.yaml は「ミスが0件なら**全文字種** accuracyRate=100」と書いており、出現0の文字種についてどちらの規則が優先されるかが読み取れない。(2) `keystrokeIntervalsMs` が空(打鍵1回以下)の場合の `consistency` が未定義だが、カラムは NOT NULL で保存が必須
- 推奨対応: api-spec.yaml の該当 description に「出現回数0の文字種は行を返さない(または accuracyRate=null)」を1行足し、screen-design.md 4章の「全文字種100%」を「出現した文字種は100%」に揃える。consistency は「算出不能時は 0 とする」等の既定値を TBL-04 か api-spec に明記する

### B3. `isNewBest` の判定基準が一意に決まらない

- 対象ファイル・箇所: `api-spec.yaml` `SessionResult.isNewBest` / `screen-design.md` S-04「自己ベスト比較(この難易度の自己ベストと比較し、更新していれば強調表示)」
- 指摘内容: FR-09 の自己ベストは **Net KPM 最大** と **正確率最大** の2指標だが、`isNewBest` は boolean が1つしかない。「Net KPM を更新したとき」「正確率を更新したとき」「どちらかを更新したとき」のどれを指すかが書かれておらず、S-04 の「強調表示」の対象(どちらの数値を光らせるか)も決まらない
- 推奨対応: `isNewBest` を `isNetKpmBest` / `isAccuracyBest` の2フラグに分けるか、`isNewBest` の description に「Net KPM または正確率のいずれかが `previousBest` を上回った場合 true」と定義を1行書く
- **対応状況(2026-08-26, P2-07)**: クローズ。`api-spec.yaml` の `isNewBest` を `isNetKpmBest`/`isAccuracyBest` の2フラグに分割し、`screen-design.md` S-04 の強調表示対象も対応させた

### B4. バリデーションエラー・不正 ID に対する 4xx レスポンスが API 仕様に無い

- 対象ファイル・箇所: `api-spec.yaml` 全エンドポイント(定義済みは 500 と `/sentences` の 404 のみ)
- 指摘内容: `POST /api/users` は `minLength: 1` を課しているのに違反時の応答が無い。`POST /api/sessions` の必須項目欠落・不整合(例: `durationSeconds: 0`)時、`/users/{userId}/sessions` 等で存在しない userId を渡した時の挙動も未定義。ServerError は「DB接続断等のサーバー内部エラー(NFR-09)」と用途が限定されているため、これらを 500 に寄せる読み方もできない。P4 のテスト設計で異常系ケースが起こせず、実装者ごとに 400/404/500 の判断がぶれる
- 推奨対応: `components.responses` に `BadRequest`(400)と `NotFound`(404)を追加し、各エンドポイントに1行ずつ紐づける。本文スキーマまでは P3 でよい

### B5. S-05 の難易度選択に必要なデータの取得元が画面↔API 間で紐づいていない

- 対象ファイル・箇所: `screen-design.md` S-05「自己ベストセクション: 難易度選択」 / `api-spec.yaml` `GET /api/topic-sets`(summary が「(S-02)」のみ)
- 指摘内容: S-05 は難易度を選ばせる UI を持ち、`GET /api/users/{userId}/best` は `topicSetId` を required にしている。つまり S-05 でも難易度一覧が要るが、`GET /api/topic-sets` は S-02 専用として記載されており、S-05 側にも取得元の記載が無い。画面・API の相互整合(P2 完了条件)に小さな穴が残っている
- 推奨対応: `GET /api/topic-sets` の summary を「(S-02, S-05)」にする。あわせて screen-design.md S-05 に「難易度の選択肢は `GET /api/topic-sets` から取得」を1行追記する

### B6. TBL-06 の `char_type` に CHECK 制約が無く、TBL-05 と非対称

- 対象ファイル・箇所: `table-definition.md` TBL-05 `char_type`(CHECK あり) / TBL-06 `char_type`(制約なし)
- 指摘内容: 同じドメイン値を持つ2カラムで制約が揃っていない。FR-10(4) の正解率は TBL-06 を分母、TBL-05 を分子に使うため、値集合がずれると集計が静かに壊れる(分母側に想定外の文字種が入っても弾かれない)
- 推奨対応: TBL-06 `char_type` にも同じ CHECK 制約を付ける。B1 の帰属ルールと合わせて1回で直す

### B7. `shared/testdata/` の用途を「P9 で使用」に限定した記述が charter.md 4.1 と食い違う

- 対象ファイル・箇所: `system-architecture.md` 4章 `shared/ testdata/ … 共通テストベクタ(P9 で使用)`
- 指摘内容: charter.md 4.1 は「正しさは `shared/testdata/` の共有テストベクタ JSON で検証する。**他言語実装は**同じ JSON を通すことで同値性を保証する」と書いており、テストベクタは(P9 の移植検証だけでなく)P5 の TS 実装そのものの検証手段として位置づけられている。CLAUDE.md の「実装の正しさは `shared/testdata/` の共有テストベクタで検証する」も同じ読み。「P9 で使用」と書くと、P4 のテスト設計・P5 の実装時にテストベクタを作らない判断につながりうる
- 推奨対応: 「共通テストベクタ(P5 で TS 実装の検証に使用し、P9 の Java 移植時は同じ JSON で同値性を確認する)」に書き換える。ADR-002 の記述(Java 実装は P9 のみ)とは矛盾しない

## 重要度C(参考)

### C1. system-architecture.md 3章の FR 割り当てと api-spec.yaml の記載粒度が微妙にずれる

- 対象ファイル・箇所: `system-architecture.md` 3章「バックエンド API / Spring Boot Controller」行(FR-01, FR-07〜FR-13)/ `api-spec.yaml` `POST /api/sessions`(FR-04, FR-05, FR-06, FR-07)
- 指摘内容: `POST /api/sessions` は FR-04(ミス記録)・FR-05(終了条件の記録)も受け取るが、Controller 行の対応 FR には入っていない。実害はないが、FR→レイヤの対応表を後で機械照合するとき差分になる
- 推奨対応: Controller 行に FR-04・FR-05 を追記するか、「FR-04/FR-05 は判定主体がフロントエンドのため受領のみ」の注記を入れる

### C2. table-definition.md 未決事項の参照先文書が実態と合っていない

- 対象ファイル・箇所: `table-definition.md` 未決事項3点目「P3 `logic-spec/romaji-automaton.md` 相当の詳細設計で確定」
- 指摘内容: Consistency の統計量はローマ字オートマトンではなく集計計算(typing-core)の仕様であり、romaji-automaton.md の守備範囲外。`docs/_index.md` の P3 成果物にも集計ロジックの文書は無い
- 推奨対応: 「P3 `class-design.md`(typing-core の集計ロジック)」に直す。または P3 着手時に集計ロジック仕様の置き場を決める

### C3. OpenAPI 3.0 では `$ref` の兄弟キーワードが無視される

- 対象ファイル・箇所: `api-spec.yaml` `SessionResult.previousBest`(`$ref` と同階層に `nullable: true` / `description`)
- 指摘内容: OpenAPI 3.0.3 の仕様上、`$ref` と並べた `nullable`/`description` はツールに無視される。初回セッション時に null を返す意図(screen-design.md 4章)がコード生成・バリデーションに反映されない
- 推奨対応: `allOf: [$ref: ...]` + `nullable: true` の形にするか、P5 の実装時に注意点として拾う

### C4. 画面遷移図に本文で述べた遷移が描かれていない

- 対象ファイル・箇所: `screen-design.md` 2章(遷移図と直下の箇条書き)
- 指摘内容: 「S-02 のヘッダーから S-05・S-06 へ直接遷移できる」は本文にあるが図に無い。また S-06 からの戻り導線が図・本文のどちらにも無い
- 推奨対応: 図に破線で追記するか、S-06 の詳細表に「戻る」遷移を1行足す

### C5. 名前を変更・切り替える導線が無い

- 対象ファイル・箇所: `screen-design.md` 2章(localStorage に値があれば S-02 から開始)
- 指摘内容: 一度 localStorage に保存すると S-01 に戻る手段が定義されていない。FR-12 の要求範囲外なので欠陥ではないが、動作確認や別名でのテスト時に困る
- 推奨対応: P5 実装時に S-02 の「名前を変える」リンク程度で吸収する。今は申し送りでよい

### C6. お題0件を 404 で表現している

- 対象ファイル・箇所: `api-spec.yaml` `GET /api/topic-sets/{topicSetId}/sentences` の "404: 指定したお題セットが存在しない、またはお題が0件"
- 指摘内容: 「セットは在るが空」を 404 にすると、フロント側で「セット選択が不正」と「シード投入漏れ」を区別できない。UC-01 の事前条件(お題1件以上)を満たさない運用ミスの切り分けがしづらい
- 推奨対応: 空のときは 200 + 空配列にし、S-02 側でエラー表示する。優先度は低い

### C7. 文字種の表記が表示用と値用で異なる

- 対象ファイル・箇所: `requirements.md` FR-04/FR-10 と `screen-design.md` S-06(撥音「ん」/促音「っ」)/ `api-spec.yaml`・`table-definition.md`(撥音ん/促音っ)
- 指摘内容: 表示文言と永続値で表記が違う。意図的な使い分けと読めるが、glossary.md 側に対応が無いと実装時に取り違えうる
- 推奨対応: table-definition.md TBL-05 に「表示文言は『撥音「ん」』、格納値は `撥音ん`」の注記を1行

### C8. 自己ベストが終了条件(お題N文/制限時間)をまたいで集計される

- 対象ファイル・箇所: `api-spec.yaml` `GET /api/users/{userId}/best`(キーは topicSetId のみ)/ `table-definition.md` TBL-04 `end_condition_type` の備考「同じ難易度でも条件別に履歴を区別するために使う」
- 指摘内容: 履歴は終了条件で区別する一方、自己ベストは難易度のみで集計する。requirements.md FR-09 の要求(難易度ごと)には合致しているので欠陥ではないが、テーブル側だけ条件を区別している非対称さが、P4 のテスト期待値を書く時に迷いを生む
- 推奨対応: FR-09 のとおり難易度のみでよい旨を api-spec の description に1行明記し、意図的であることを残す

### C9. 台帳・ステータスの更新(呼び出し元作業)

- 対象ファイル・箇所: `docs/_index.md`
- 指摘内容: BD-001〜BD-006 が `status: draft` のままで、レビュー欄も「—」。ADR-003 が decisions 表に未登録、`review-20260823_p2-interim-opus.md`(REV-005)が 90_review 表に未登録
- 推奨対応: ゲート判定後に一括更新する(レビュアーの守備範囲外のため対応不要という判断でもよい)

## 観点別の総括

### 1. トレーサビリティ

問題なし。FR-01〜FR-13・NFR-01〜NFR-09・UC-00〜UC-07・TBL-01〜TBL-06 の相互参照を突き合わせ、参照先が実在しない ID・カバー漏れは検出しなかった。とくに、API/テーブルを持たない FR(FR-02/03/11)を「なし + 理由」で明示している点、`table-definition.md` の FR×テーブル対応表が全 FR を1行ずつ列挙している点は、抜けの検出が機械的にできる形になっている。

### 2. charter.md との整合性

問題なし。charter.md 3.1 の MVP 8項目はすべて P2 の設計に落ちている(#1→FR-01/02+S-03+TBL-03、#2→FR-05+S-02/S-03+TBL-04、#3→FR-03+S-03、#4→FR-06+`POST /api/sessions`、#5→FR-07+TBL-04、#6→FR-08/09+S-05+2 API、#7→FR-13+TBL-02/03+S-02、#8→FR-10/11+S-06+TBL-05/06)。3.2 のスコープ外(認証・ランキング・お題投稿UI・WebSocket・英語モード・かな入力・モバイル対応・テーマ切替・SNS共有/エクスポート・自動お題生成・自由入力モード)に該当する記述の混入も無い。localStorage への userId 保持は認証機構ではなく再入力の省略であり、ADR-001/ADR-003 と矛盾しない。charter.md 3.3 の規模感(テーブル6・API7本・画面6)は実際の設計と一致している。

### 3. 内部矛盾・曖昧さ

指摘 B1〜B6 が該当。いずれも「相互に矛盾する2つの記述」ではなく「実装者が一意に解釈できない箇所」で、修正はどれも1〜2行で済む。用語面では、拍単位ミスとキー単位ミスの区別、「0件」と「値が0」の区別が明示的に定義されており(er-diagram.md 3.1 / screen-design.md 4章末)、P1 レビューで問題になった粒度の混同は再発していない。

### 4. 完了条件の充足

充足していると判断する。「画面・API・テーブルの3点が相互整合し、各項目が FR-ID までトレースできる状態」に対し、3点の往復突き合わせで穴は B5(S-05 の難易度一覧の取得元記載漏れ)のみで、これは記載の欠落であって設計の欠落ではない。空セクション・TBD の残置は無く、残る未決事項はすべて「何を・どの工程で・どの文書で決めるか」まで書かれている(インデックス設計→P3 db-access.md、Flyway 分割→P5、Consistency の統計量→P3、ビジュアルデザイン→実装時)。P1 由来の未決事項が上流文書へ遡って解決済みに更新されている点も確認した。

### 5. 過剰・スコープ超過

問題なし。むしろ削る方向の判断(タイピング中は通信しない、打鍵生ログを永続化しない、FR-11 のアドバイスを永続化しない、FR-10(3) の分母を近似で済ませる、ops 観点をADR-003で固定する)が理由付きで積み重なっており、charter.md 6章の完走優先方針と整合している。`session_kana_counts`(TBL-06)は 1 テーブル増だが、FR-10(1)(4) の分母をフロント側の分類ロジックだけで賄うための最小の追加であり、ADR-002 と一貫した必然的な帰結として説明されている。過剰設計ではないと判断する。

### 総合判定

重要度 A = 0 件。ゲート②(doc 観点)は通過可としてよい。B1〜B7 は P2 の残りか P2.5 着手前に片付けることを推奨する(とくに B1・B6 はテーブル定義の CHECK 制約に関わるため、Flyway のマイグレーションを書き始める前に確定させると手戻りが小さい)。C1〜C9 は P3 以降への申し送りでよい。
