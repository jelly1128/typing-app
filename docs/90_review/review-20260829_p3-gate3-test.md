---
doc_id: REV-011
status: fixed
updated: 2026-08-29
---

# テスト可能性レビュー(2026-08-29)

対象:

- `docs/30_detail-design/class-design.md`(DD-001)
- `docs/30_detail-design/sequence.md`(DD-002)
- `docs/30_detail-design/db-access.md`(DD-004)
- `docs/30_detail-design/logic-spec/romaji-automaton.md`(DD-003)
- `docs/30_detail-design/logic-spec/session-metrics.md`(DD-005)
- `docs/30_detail-design/logic-spec/advice-generation.md`(DD-006)

参照した上位文書: `docs/20_basic-design/api-spec.yaml`(BD-003)、`docs/20_basic-design/table-definition.md`(BD-005)、`docs/10_requirements/requirements.md`(REQ-001)

判定の前提: 「P3設計書(+上位のBD-003/BD-005)だけを渡された担当者が、P4でUT/IT/STのケースを一意に書き下せるか」。実装者が読めば埋められる程度の曖昧さでも、テストの**期待値**が2通り以上に読めるものはAとして挙げる。

---

## 重要度A(必須)

### A1. FR-03「次に打つべき文字」の表示内容が、相互参照の空振りで確定していない

- 対象ファイル・箇所: `romaji-automaton.md` 6.1節末尾「FR-03(リアルタイム表示)との対応」/ `class-design.md` 2.2(`types.ts` の `KeystrokeResult`)・2.6(`TypingDisplay.vue`)
- 指摘内容: `romaji-automaton.md` は「表記ゆれのうちどれを画面ヒントに出すかは `class-design.md` の表示ロジック側で決める」と委譲しているが、`class-design.md` 2.6 の `TypingDisplay.vue` は「`KeystrokeResult` を確定済み文字・次に打つ文字・ミス位置の表示に変換」としか書いておらず、**選択規則がどちらの文書にも無い**。結果として FR-03 のテストケース「『し』の1手目で `s` を打った直後、画面に何が表示されるか」の期待値が一意に決まらない(`si` を出すのか、候補集合 `{si, shi}` の共通接頭辞だけ出すのか、最初に定義された表記を出すのか)。加えて次の3状態の表示仕様も未定義で、いずれも FR-03 の中核ケースになる:
  1. 撥音んの**保留中**(`"n"` を打ったが確定していない)状態で「確定済み文字」に `n` を含めるか
  2. **押し戻し**が起きた瞬間(前拍が確定し、同じキーが次拍の1手目として消費される)に、1キー入力で2拍分の表示が同時に動くのか
  3. 「直近のミス位置」をいつまで表示し続けるのか(次の正解キーで消えるのか、拍確定まで残るのか)
- 推奨対応: `class-design.md` 2.2 に `KeystrokeResult` のフィールドを型レベルで確定させ(例: `confirmedText` / `pendingText` / `nextHint` / `missAt`)、`nextHint` の選択規則(例: 「候補集合を辞書順で並べた先頭パターンの未入力部分」)と保留・押し戻し時の各フィールドの値を表で定義する。3状態それぞれの入力例と期待表示を1行ずつ書けば P4 はそのままケース化できる。

### A2. FR-05(終了条件判定)の担当モジュールが存在せず、`durationSeconds` / `keystrokeIntervalsMs` の計測定義も無い

- 対象ファイル・箇所: `class-design.md` 2.4(`sessionStore` の責務)・2.8 トレーサビリティ表 FR-05 行 / `sequence.md` 1章(Note「終了条件達成まで繰り返し」)/ `session-metrics.md` 1章
- 指摘内容: FR-05 は 2.8 で `sessionStore` / `HomeView` / `TypingView` に紐づけられているが、2.4 の `sessionStore` の責務は「一時保持」と明記され「ロジックを持たず記録のみを行う」とまで書かれており、**終了条件を判定する主体がどこにも定義されていない**。P4 で FR-05 の UT を書こうとしても対象モジュールが選べず、境界値(お題N文目の最終拍を確定した瞬間 / 制限時間ちょうど)の期待値も定義できない。特に次が不定:
  - 制限時間モードで、時間経過時に**打鍵途中の拍**をどう扱うか(その拍のキーは `correctKeyCount` に入るのか、拍として `kanaCounts` に計上されるのか)
  - `durationSeconds` の計測開始点(お題表示時 / 最初のキー入力時)と終了点。`session-metrics.md` は「セッション所要時間[秒]」としか書いておらず、制限時間モードで `endConditionValue` と一致するのかどうかも読み取れない
  - `keystrokeIntervalsMs` の要素数の定義(Nキーで N-1 要素か、初回キーまでの待ち時間を含む N 要素か)。`session-metrics.md` 2.5 の UT は配列を直接与えるので書けるが、**配列を生成するフロント側**の UT 期待値が書けない
- 推奨対応: `class-design.md` 2.4 に終了条件判定の担当(例: `sessionStore` のアクション、または `judgment-engine` 外の `sessionController` 相当)を追加し、`durationSeconds` の開始/終了イベントと `keystrokeIntervalsMs` の定義(「隣接する2キー入力の時刻差、正誤問わず。要素数は総キー入力数−1」等)を1行で確定する。打鍵途中の拍の扱いも明記する。

### A3. ミス記録・かな出現回数の付帯項目(`kanaOccurrenceNo` / `prevKana` / `kanaCounts`)の生成規則と生成主体が未定義

- 対象ファイル・箇所: `romaji-automaton.md` 6.1(`ミスを記録する` の引数)・`この拍を確定する` / `class-design.md` 2.4(`sessionStore`)/ `api-spec.yaml` `MissRecordInput`・`KanaCountInput`
- 指摘内容: `MissRecordInput` は `kanaOccurrenceNo` を **required** としているが、`romaji-automaton.md` の `ミスを記録する` が渡す項目は「対象拍 / 期待キー候補 / 実際キー / 直前拍 / 文字種タグ」の5つだけで `kanaOccurrenceNo` が無い。`class-design.md` 2.4 は `sessionStore` を「ロジックを持たず記録のみ」と定義しているため、**採番する主体が設計上どこにも存在しない**。同様に `kanaCounts`(TBL-06 の分母)も「`sessionStore` が保持する」とあるだけで集計規則が無い。この結果、次のテストが書けない:
  - FR-04 の UT: ミス記録1件の期待値(`kanaOccurrenceNo` の値)が決まらない
  - FR-10 の IT/UT: `db-access.md` 4.3 の拍単位重複除去は `(session_id, kana, kana_occurrence_no)` に依存するため、採番規則が決まらないと「同一拍への3回ミスが1と数えられる」ことの検証データが作れない
  - 具体的に不定な点: (a) 採番は「拍が出現した順」か「ミスが発生した順」か。(b) 拍が出現したがミスが無かった場合に番号を消費するか。(c) **お題文をまたいだときに1へリセットするか**(1セッションで複数のお題を打つため必ず発生する)。(d) 同じく `prevKana` が、お題文の先頭拍で NULL になるのか前の文の末尾拍になるのか(TBL-05 は「セッション最初の拍はNULL」としか書いていない)。(e) `kanaCounts.totalCount` は「出題された拍」を数えるのか「確定した拍」を数えるのか(制限時間切れで未入力の拍が残る場合に差が出る)
- 推奨対応: `class-design.md` 2.4 または `romaji-automaton.md` に「セッション記録の生成規則」の節を新設し、上記 (a)〜(e) を確定する。特に (c)(d)(e) は FR-10 の分子・分母の両方に効くため、P4 のテストデータ設計の前提になる。

### A4. お題文(かな列)→拍列の分解が、設計上どこにも存在しない

- 対象ファイル・箇所: `romaji-automaton.md` 3章「前提」/ `table-definition.md` TBL-03 / `class-design.md` 2.2・2.4(`topicStore`)
- 指摘内容: `romaji-automaton.md` 3章は拍列分解を「本仕様の対象外とし、お題データ作成(シードデータ投入)側で拍列として保持する」としているが、TBL-03 `sentences` は `text` と `reading`(かな文字列)しか持たず**拍列を保持する列が無い**。`api-spec.yaml` の `Sentence` スキーマも `reading: string` のみ。`class-design.md` の `topicStore` にも `judgment-engine` にも分解モジュールが定義されていない。したがって「FR-01 でお題を取得し、FR-02 の判定エンジンに渡す」経路の入力(`MoraSequence`)を**誰がいつ作るのかが未定義**であり、次のテストが書けない:
  - FR-01→FR-02 の IT: `GET /sentences` のレスポンスから判定開始までの結合ケースの入力データが作れない
  - 拍分解自体の UT: 「しゃ」を2文字1拍に、「っ」「ん」「ー」を単独拍に分ける処理の期待値表が存在しない(かつ、この処理が無ければ拗音の判定に到達できない)
- 推奨対応: いずれかを P3 のうちに確定する。(案1) `judgment-engine/` に `moraSplit.ts` を追加し、`reading` からの機械的分解規則(小書き文字が続けば2文字1拍、等)を `romaji-automaton.md` に節として書く。(案2) TBL-03 に拍列カラムを追加し、シードデータの形式を `db-access.md` に定義する。どちらを採っても、P4 は分解の UT ケースを列挙できるようになる。

### A5. `POST /api/sessions` の「値域チェック」の対象項目が網羅されておらず、400系 IT を列挙できない

- 対象ファイル・箇所: `sequence.md` 1章(`Svc->>Svc: 値域チェック(400対象、api-spec.yaml)`)/ `class-design.md` 1.4(`SessionService`・`InvalidSessionSubmissionException`)/ `api-spec.yaml` `POST /api/sessions` description
- 指摘内容: `api-spec.yaml` が400と明記しているのは4条件(`endConditionValue` の範囲、`durationSeconds < 1`、`missRecords[].kana` が `kanaCounts` に無い)だけで、`sequence.md` はそこへ丸投げしている。しかし `SessionSubmission` には下限・上限が定義されていない項目が多く、それらの期待動作(400 か、素通しして201 か、DB制約違反で500 か)が読み取れないため、FR-04/FR-06/FR-07 の異常系 IT を「一覧として」書き下せない。少なくとも次の入力に対する期待値が不定:
  - `correctKeyCount` が負値/0(0は正常系のはずだが、`session-metrics.md` 4章の判断#3は「総キー入力数=0」を正常系として扱っており、400ではないと読める。明示が必要)
  - `keystrokeIntervalsMs` に負値が含まれる/要素数が総キー入力数と整合しない
  - `kanaCounts` が空配列(`required` だが `minItems` 指定なし)。`missRecords` が非空で `kanaCounts` が空なら既定の4条件目で400になるが、両方空なら?
  - **`kanaCounts` に同一 `kana` が2件含まれる** → TBL-06 の UNIQUE `(session_id, kana)` 違反となり、A6 の対応表が無い現状では 400 か 500 か決まらない
  - `missRecords[].charType` と `kanaCounts[].charType` が同一 `kana` に対して食い違う → FR-10 の `byCharType.accuracyRate` が 100 超や負値になりうるが、検証するともしないとも書かれていない
  - `netKpm`/`rawKpm` が TBL-04 の `NUMERIC(6,2)`(最大 9999.99)を超える入力(例: `durationSeconds=1`, `correctKeyCount=1000` → 60000)。A7 と併せて未定義
- 推奨対応: `class-design.md` 1.4 の `SessionService` に「値域チェック一覧」の表(項目 / 条件 / 違反時の応答)を追加する。api-spec 側で足りない分は `change-log.md` 経由で BD-003 にも反映する。P4 はこの表の行数がそのまま IT ケース数になる。

### A6. 例外→HTTPステータス/`code`/メッセージの対応表が無く、異常系の期待値が書けない

- 対象ファイル・箇所: `class-design.md` 1.4「例外・エラーハンドリング」/ `sequence.md` 5.1・5.2 / `api-spec.yaml` `ErrorResponse`
- 指摘内容: `GlobalExceptionHandler` の責務は「例外→`ErrorResponse` 変換、`traceId` 採番、500時のログ出力」とあるが、**どの例外がどのステータス・どの `code` 文字列・どのメッセージになるかの対応表が無い**。`api-spec.yaml` の `code` も「例 VALIDATION_ERROR, USER_NOT_FOUND, INTERNAL_ERROR」という例示に留まる。そのため IT のアサーションで期待できるのが HTTP ステータスのみとなり、`ErrorResponse` のボディを検証するケースが書けない。加えて次が不定:
  - `POST /api/sessions` で `userId` と `topicSetId` が**両方**存在しない場合、どちらの `code` を返すか(判定順序)。`class-design.md` は `UserNotFoundException` / `TopicSetNotFoundException` を並列に挙げるだけ
  - `GET /api/users/{userId}/best` の404: `db-access.md` 4.2 の MAX クエリは存在確認をしないため、`userId`/`topicSetId` の存在確認クエリが Repository 一覧(4.1)に**無い**。0件と不存在をどう区別するかが設計から追えず、「存在するユーザーで0件 → 200 + null」と「不存在ユーザー → 404」の作り分けをテストで担保できない
  - `GET /api/topic-sets/{id}/sentences` の「お題が0件で404」(api-spec に明記)が、`class-design.md` の `TopicSetNotFoundException`(「topicSetId不在」とのみ記載)に反映されていない。0件時の期待応答が2通りに読める
  - Bean Validation 由来の例外(必須項目欠落)やパス変数の型不正(`/api/users/abc/sessions`)が、どの `code` の400になるか未定義
- 推奨対応: `class-design.md` 1.4 に「例外クラス / 発生条件 / HTTPステータス / `code` / メッセージ雛形」の対応表を作り、404 の判定順序も明記する。`db-access.md` 4.1 に存在確認用メソッド(`existsById` 等)を追加する。

### A7. FR-06 の丸め規則(丸めモード)と桁あふれ時の挙動が未定義で、境界値 UT の期待値が一意にならない

- 対象ファイル・箇所: `session-metrics.md` 2.4・3章 / `class-design.md` 1.3(`SessionMetricsResult` の「いずれも小数第2位で丸め済み」)
- 指摘内容: 「小数第2位で丸める」とあるだけで**丸めモードが指定されていない**。`accuracy = 2/3*100 = 66.666...` は問題ないが、`1/8*100 = 12.5` を第2位に丸める場面や、`netKpm = 100/(3/60) = 2000.0` のような割り切れない中間値(例: 期待値 `33.335` → `33.34`(HALF_UP)か `33.33`(HALF_EVEN)か)で期待値が2通りになる。`shared/testdata` は他言語へ移植する共有ベクタである以上(CLAUDE.md のロジック層制約)、丸めモードとゼロ埋め表現の確定は必須。あわせて次も未定義:
  - 丸めるのは typing-core(`SessionMetricsResult`)か保存直前か。1.3 は「丸め済み」、2.4 は「保存前に丸める」と読め、二重丸めの可能性が残る
  - `NUMERIC(6,2)` / `NUMERIC(8,2)` を超える値の扱い(A5 参照)。切り詰めるのか、400 にするのか、DB例外→500 なのかが決まらないため、上限境界値の UT/IT が書けない
  - `consistency` の平方根計算の精度(倍精度で計算してから丸めるのか)
- 推奨対応: `session-metrics.md` 3章に「丸めは HALF_UP、小数第2位、丸めは typing-core の出口で1回だけ」等を明記し、桁上限を超える入力の扱いを A5 の値域チェック表に載せる。P4 はここから丸め境界のテストベクタを機械的に作れる。

### A8. FR-10 の出力配列の順序規則・件数上限・`prevKana` NULL の扱いが未定義

- 対象ファイル・箇所: `db-access.md` 4.3 / `sequence.md` 4章(`Svc->>Svc: kana/prevKana/charTypeごとに突き合わせ、率を計算`)/ `api-spec.yaml` `MissAnalysis`
- 指摘内容: `api-spec.yaml` は各観点を「多い順」とするが、P3 側にも**同数・同率だった場合のタイブレーク規則が無い**ため、配列の順序を含む期待値(=レスポンス全体の一致検証)が書けない。FR-10 の受け入れ条件は「多い順にソートされ、上位を確認できる」なので、順序はテスト対象そのものである。さらに:
  - 返却件数の上限が無い(「上位」が何件か未定義)。全件返すのか上位N件かで期待値が変わる
  - `byKana` は `missCount` 多い順か `missRate` 多い順か明記が無い(`byPrevKana` は `missRate` しか持たないので率順と読めるが、`byKana` は両方持つ)
  - `db-access.md` 4.3 の拍単位ミスクエリは `mr.prev_kana` を取得するが、**`prev_kana IS NULL`(セッション先頭拍)の行を `byPrevKana` に含めるのか除外するのか**が未定義。含めるなら分母(`session_kana_counts` の該当かな出現回数)が存在せず0除算になる。A3(d) と併せて、FR-10(3) のテストデータが作れない
  - `byPrevKana` の分母は「該当かなの出現回数合計」という近似だが、`missRate` が100%を超えうる(直前がそのかなだった拍でのミス数 ÷ そのかな自身の出現回数)。上限クランプの有無が未定義で、境界ケースの期待値が決まらない
- 推奨対応: `db-access.md` 4.3 の末尾に「並び順(第1キー/第2キー)・返却件数・`prev_kana IS NULL` の扱い・率の上限クランプ」を4行で確定する。

---

## 重要度B(推奨)

### B1. Service / Controller のメソッドシグネチャが無く、UT の単位を設計書から切り出せない

- 対象ファイル・箇所: `class-design.md` 1.4 の Controller/Service 表(責務のみ)/ `sequence.md`
- 指摘内容: メソッド名が判明するのは `sequence.md` に現れる `submitSession(...)` と `getMissAnalysis(userId)` のみで、引数と戻り値の型は `(...)` のまま。`UserService` / `TopicSetService` はメソッド名すら無い。UT ケース ID を「クラス×メソッド×条件」で採番する運用ができず、P4 の担当者が命名を発明することになる(P5 実装とズレる)。
- 推奨対応: 各 Service に「メソッド / 引数 / 戻り値 / 対応FR」の4列表を追加する。DTO 名は 1.4 の変換規則から導けるので型名だけで足りる。

### B2. NFR-01 / NFR-02 の計測ポイントが P3 側に無く、ST の合否判定を定義できない

- 対象ファイル・箇所: `class-design.md` 2.2・2.6(`judgment-engine` / `TypingDisplay.vue`)、`requirements.md` NFR-01(検証方法「ブラウザ開発者ツールでの計測、または簡易な計測用ログ」)
- 指摘内容: NFR-01(50ms)の**計測区間の始点・終点**が定義されていない。`keydown` イベント受信からか、`sequenceJudge` 呼び出しからか、DOM 更新完了(次フレーム描画)までか、で数値は大きく変わる。NFR-02(2秒)も「コールドスタートを除く」の判定方法(何回目のアクセスから計測するか)・測定回数・合格基準(平均か最悪値か)が無い。現状では ST-xxx の期待結果欄に「50ms以内」としか書けず、実測との突き合わせがテスト実施者の判断になる。
- 推奨対応: `class-design.md` 2.2 に計測用フック(例: `keydown` の `event.timeStamp` から `nextTick` 後までを `performance.now()` で計測)を1行加え、NFR-02 は「連続2回目以降のアクセスで、開発者ツール Network の DOMContentLoaded を3回計測しその最大値」等の条件を決める。

### B3. NFR-09(ロールバック・部分保存なし)を検証する手段が設計に無い

- 対象ファイル・箇所: `db-access.md` 5章 / `sequence.md` 5.1
- 指摘内容: 「いずれかの挿入が失敗した場合は全体をロールバック」と書かれているが、**テストでその失敗をどう起こすか**が設計から導けない。DB接続断を再現する手段(コンテナ停止、プロキシ遮断、モックでの例外注入)も、制約違反を意図的に起こす入力(A5 の `kanaCounts` 重複 kana など)も定義されていないため、IT の手順欄が書けない。
- 推奨対応: `db-access.md` 5章に「ロールバック検証は `session_kana_counts` の UNIQUE 違反を意図的に発生させる」等の再現手段を1つ決めて明記する(400 で弾く方針にするなら、代わりに Repository のモック例外注入を指定する)。

### B4. 文字種の enum 文字列が logic-spec と DB/API で食い違っている(長音ー / 長音)

- 対象ファイル・箇所: `romaji-automaton.md` 3章・6.1(`長音ー`)/ `db-access.md` 1章(`CharType { 清音, 拗音, 撥音ん, 促音っ, 長音 }`)/ `api-spec.yaml`・TBL-05 CHECK 制約(`長音`)
- 指摘内容: `romaji-automaton.md` は文字種の値を「長音ー」と表記し、`db-access.md`・`api-spec.yaml`・TBL-05 は「長音」。`撥音ん`・`促音っ` は3者一致しているため、単なる本文中の言い換えではなく値の不一致として読めてしまう。`shared/testdata` の期待値文字列が2通りになり、テストベクタが書けない(または DB CHECK 違反になる実装を誘発する)。
- 推奨対応: `romaji-automaton.md` 側を「長音」に統一する(`db-access.md` 1章の enum が DB/API と一致しているのでそちらが正)。

### B5. `expectedKey` の連結規則に、重複除去と単一候補時の書式が明記されていない

- 対象ファイル・箇所: `db-access.md` 3章 / `romaji-automaton.md` 6.1(`期待キー候補 = { p[入力済み文字列の長さ] | p ∈ 候補集合 }`)
- 指摘内容: 「候補の1文字ずつをカンマ区切りでアルファベット順に連結」とあるが、(a) 同じ文字が複数候補から出る場合の重複除去(促音っで次拍が「し」なら候補は `{s, c, xtu, xtsu, ltu, ltsu}` → 先頭文字は `s,c,x,x,l,l` → `"c,l,s,x"` か `"c,l,l,s,x,x"` か)、(b) 候補が1つのときに区切り文字なしの単文字になること、(c) `-`(長音)のようなアルファベット外の文字のソート順、が明記されていない。集合表記から (a) は重複なしと読むのが自然だが、テストの期待値は明示されていないと2通りになる。FR-10(2) の `byErrorPattern` は `expected_key` で GROUP BY するため、この文字列の一意性がそのまま集計結果の期待値に効く。
- 推奨対応: `db-access.md` 3章に「重複は除去する」「1件のときは区切り文字なし」「ASCII コード順」を追記し、促音の例を1つ載せる。

### B6. `UserService` の name バリデーションが「trim後1〜100文字」だけで、境界値ケースの期待値が決まらない

- 対象ファイル・箇所: `class-design.md` 1.4(`UserService`)/ `api-spec.yaml` `POST /api/users`
- 指摘内容: 「trim」の定義が未確定(全角スペースのみの名前 `"　"` は Java の `String.trim()` では空にならず、`strip()` なら空になる)。100文字の判定がコードポイント単位か UTF-16 単位か(サロゲートペアを含む絵文字名)も未定義。TBL-01 は `VARCHAR(100)`。FR-12 の境界値 UT(0/1/100/101文字、空白のみ、前後空白付き)の期待値が確定できない。
- 推奨対応: `class-design.md` 1.4 に「`String.strip()` を使用」「長さはコードポイント数」等を明記する。

### B7. `DISTINCT ON` クエリに `ORDER BY` が無く、テストの再現性が担保されない/検証環境を選ぶ

- 対象ファイル・箇所: `db-access.md` 4.3 のネイティブクエリ
- 指摘内容: PostgreSQL の `DISTINCT ON` は `ORDER BY` を伴わない場合、グループ内のどの行が返るかが不定になる。本ケースでは同一 `(session_id, kana, kana_occurrence_no)` グループ内の `prev_kana`/`char_type` は同値のはずなので実害は小さいが、A3(d) で `prevKana` の規則が確定するまでは「同じ拍の複数ミスで `prev_kana` が異なる」データも作れてしまい、テストが不安定になる。またネイティブクエリのため H2 等では検証できず、IT は PostgreSQL 実体(Testcontainers または Docker Compose の開発DB)が前提になるが、その前提が設計に書かれていない。
- 推奨対応: `ORDER BY mr.session_id, mr.kana, mr.kana_occurrence_no, mr.id` を付けて返る行を確定させる。あわせて「FR-10 の Repository テストは PostgreSQL 実体で行う」ことを `db-access.md` に1行残す(テスト方式の確定自体は P4 の test-plan で可)。

### B8. シードデータと `sort_order` のタイブレークが未確定で、FR-01/FR-13 の一覧期待値が書けない

- 対象ファイル・箇所: `db-access.md` 4.1(`findAllByOrderBySortOrder()` / `findByTopicSetId()`)・6章末尾(「Flyway マイグレーションへの反映は P5」)
- 指摘内容: TBL-02 の `sort_order` に UNIQUE 制約が無いため同値がありえ、その場合の並び順が不定。`findByTopicSetId` には ORDER BY が無く、お題文一覧の順序も不定(FR-01 の「ローテーション」の起点が決まらない)。加えてシードデータの内容(難易度が何件、各セットのお題が何件・どんな `reading`)が P3 時点で未定のため、P4 でテストデータを設計する際に「初期状態で `GET /api/topic-sets` が返す件数」の期待値が書けない。
- 推奨対応: `db-access.md` 4.1 に第2ソートキー(`id`)を明記し、シードデータの最小要件(難易度3件、各セット5文以上、拗音・促音・撥音・長音を各1回以上含む等)を1段落で決める。後者は A4 の拍列の話とも直結する。

### B9. 500 / 404 発生後のフロント側の期待挙動が、テストできる粒度になっていない

- 対象ファイル・箇所: `sequence.md` 5.1・5.2
- 指摘内容: 5.1 は「エラー表示に切り替え」までで、**セッション結果を再送できるのか、破棄されるのか**が未定義(ST の期待結果が書けない)。5.2 は対象を「任意のView(S-02/S-04/S-05/S-06)」と列挙しているが、`POST /api/sessions` は S-03 から発行され 404 を返しうるのに **S-03 が列挙から漏れている**。タイピング直後に404を受けたときの導線(結果を捨てて S-01 へ戻るのか)が決まらず、該当 ST の期待値が書けない。
- 推奨対応: 5.1 に「再送はしない/結果は破棄」等の方針を1行、5.2 の対象に S-03 を追加する(または S-03 は別扱いとする理由を書く)。

### B10. `SessionResult` の組み立て責務と `playedAt` の値の出どころが曖昧

- 対象ファイル・箇所: `sequence.md` 1章(`Repo-->>Ctrl: SessionResult`)/ `class-design.md` 1.4
- 指摘内容: シーケンス上 Repository が `SessionResult` を Controller に返す形になっており、`sessionId` / `playedAt` / `previousBest` / `isNetKpmBest` を**誰が詰めるのか**が読み取れない(責務からすれば Service のはず)。特に `playedAt` は TBL-04 が `DEFAULT now()` なので、DB採番値を読み戻すのかアプリ側で採番するのかで IT のアサート方法(時刻の一致検証が可能かどうか)が変わる。
- 推奨対応: シーケンスを `Svc-->>Ctrl: SessionResult` に直し、`playedAt` の採番元を `db-access.md` に1行明記する(DB採番なら「保存後に再読込した値を返す」)。

---

## 重要度C(参考)

### C1. `shared/testdata` の形式が未定義

- 対象ファイル・箇所: `romaji-automaton.md` 9章 / `session-metrics.md` 5章 / `advice-generation.md` 5章
- 指摘内容: 3本とも「具体的なテストベクタ一覧は P4 で作成する」と申し送っているが、ファイル形式(JSON/CSV)・1ケースのスキーマ・配置ディレクトリが未定。P4 の最初の作業でここを決める必要がある。ロジックは3本とも入出力が明確なので、形式さえ決まればケースは書ける。
- 推奨対応: P4 の冒頭タスクとして「testdata スキーマの確定」を置く。

### C2. FR-10 の集計が全期間・全件をアプリ側で突き合わせる方式である点

- 対象ファイル・箇所: `db-access.md` 4.3
- 指摘内容: 拍単位ミス集合を行単位で全件取得して Service で再集計するため、セッション数の増加に伴い応答が劣化する。NFR-02(2秒)の対象に FR-10 が含まれているので、P6 の性能確認時にセッション数を振った測定(例: 1/50/500セッション)を入れておくと安心。機能テストの成否には影響しない。
- 推奨対応: P4 の ST でデータ量条件を1ケース分だけ確保しておく。

### C3. 自己ベストが終了条件をまたいで集計される

- 対象ファイル・箇所: `db-access.md` 4.2
- 指摘内容: `PersonalBest` の絞り込みは `userId` + `topicSetId` のみで、`end_condition_type`(お題N文 / 制限時間)をまたいで MAX を取る。FR-09 の要件(難易度ごと)には合致しているので仕様上の問題ではないが、テストデータを作るときに「同一難易度・異なる終了条件のセッション2件」が同じベストに混ざることを意識しないと、期待値を取り違えやすい。
- 推奨対応: P4 のテストケースに「終了条件が異なる2件で1つのベストになる」ことを確認するケースを1件入れておく。

### C4. `advice-generation.md` カテゴリ2の「総出現回数(推定)」が割り戻し計算である

- 対象ファイル・箇所: `advice-generation.md` 2章(`総出現回数(推定) = 対象.missCount ÷ (対象.missRate ÷ 100)`)
- 指摘内容: `missRate` は API 出力段階で丸められている可能性があるため、割り戻した推定値が整数にならず、閾値5との比較が境界(推定4.98 / 5.02 など)で揺れうる。テストベクタ側で「割り切れる値」を選べば検証できるので A/B ではないが、境界値ケースを作るときは丸め前提を揃える必要がある。
- 推奨対応: P4 では `missRate` が割り切れる入力(例: missCount=2, missRate=40 → 5)で境界ケースを作る。将来 `byKana` に `occurrenceCount` を持たせれば推定が不要になる。

---

## 観点別の総括

**1. 入出力の一意性** — typing-core の2本(`SessionMetricsCalculator` / `AdviceGenerator`)は record のフィールドと数式・閾値が揃っており、**入出力の一意性は概ね確保できている**(丸めモードだけが穴 = A7)。`advice-generation.md` は閾値・テンプレート文・表示順・`good` の選択条件まで確定しており、この設計書だけで UT を一意に書ける水準にある(観点1で最も出来が良い)。一方、フロント側(FR-03 の表示内容 = A1、FR-05 の終了条件と計測定義 = A2)と、API 層(A5 の値域、A6 の例外)は入出力が確定していない。

**2. 異常系・エッジケースの網羅** — 空データ系(履歴0件・自己ベスト0件・セッション0件・ミス0件)は `api-spec.yaml` と `advice-generation.md` で明示的に定義済みで、**この観点は良好**。不足しているのは (a) 不正入力の網羅(A5)、(b) 例外→応答の対応表(A6)、(c) 障害注入手段(B3)、(d) エラー後のフロント導線(B9)。DB接続断は 500 一様と決まっているので、`code`/`message` さえ決まればテストは成立する。

**3. 非機能要件の測定可能性** — NFR-01/NFR-02 に数値はあるが計測ポイントが無い(B2)。NFR-09 は挙動の定義はあるが検証手段が無い(B3)。NFR-07 は `traceId` の存在を検証する形で書けるが、形式(UUID か否か)とログ出力項目が未定のため厳密なアサートはできない。NFR-04/05/06/08 は P3 の対象外(構成・運用側)で、この設計書に不足があるとは判断しない。

**4. テストデータの再現性** — FK・NOT NULL・CHECK 制約はいずれも素直で、`users → topic_sets → sentences → sessions → miss_records/session_kana_counts` の順に投入すれば生成できる。**制約がテストデータ生成の妨げになる箇所は無い**と判断する。ただし `users.name` の UNIQUE により、テストを繰り返し実行すると find-or-create が既存行に当たるため、ケースごとに一意な名前を使うかテスト後にクリーンアップする運用が必要(P4 の test-plan で決めれば足りる)。再現性を実際に損なうのは A3(採番規則が無いとテストデータの `kana_occurrence_no` を作れない)、A4(拍列が作れない)、B7(`ORDER BY` 無し)、B8(シード未確定)。

**5. P4 完了条件の見通し** — FR-ID 別に「今この設計書だけでテストケースを書けるか」を判定すると:

| FR-ID | 見通し | 阻害要因 |
|---|---|---|
| FR-01 | △ | B8(シード未確定・お題順序不定)、A4 |
| FR-02 | ○ | 受理表・押し戻し・絞り込みまで確定済み。書ける(A4 の拍列入力が前提) |
| FR-03 | ✕ | A1(表示内容が未定義) |
| FR-04 | ✕ | A3(`kanaOccurrenceNo`/`prevKana` の規則) |
| FR-05 | ✕ | A2(判定主体・境界・計測定義) |
| FR-06 | △ | 数式は確定。A7(丸めモード)・A2(`durationSeconds` 定義)が残る |
| FR-07 | △ | A5・A6・B3(異常系)。正常系は書ける |
| FR-08 | ○ | 0件も含めて書ける |
| FR-09 | △ | A6(存在確認と404)。正常系・0件は書ける |
| FR-10 | ✕ | A8(順序・件数・NULL)、A3(分子分母の生成規則) |
| FR-11 | ○ | 閾値・境界・表示順まで確定。この設計書だけで書ける |
| FR-12 | △ | B6(trim/文字数の定義) |
| FR-13 | △ | B8(シード・タイブレーク) |

現状、**FR-03 / FR-04 / FR-05 / FR-10 の4件は「テストケース ID を1件以上紐づける」ことはできても中身(期待値)が書けない**ため、P4 完了条件を実質的に満たせない。A1〜A8 のうち、この4件に直結する A1・A2・A3・A8 を優先して解消すれば、残りは B の解消と並行して P4 に着手できる見通し。
