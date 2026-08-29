---
doc_id: REV-010
status: fixed
updated: 2026-08-29
---

# レビュー(2026-08-29)

対象:

- `docs/30_detail-design/class-design.md`(DD-001)
- `docs/30_detail-design/sequence.md`(DD-002)
- `docs/30_detail-design/db-access.md`(DD-004)
- `docs/30_detail-design/logic-spec/romaji-automaton.md`(DD-003)
- `docs/30_detail-design/logic-spec/session-metrics.md`(DD-005)
- `docs/30_detail-design/logic-spec/advice-generation.md`(DD-006)

参照した上位文書: `charter.md` / `requirements.md` / `system-architecture.md` / `screen-design.md` / `api-spec.yaml` / `table-definition.md` / `ADR-004` / `change-log.md` / `_index.md`

完了条件: 「設計書だけを渡した Claude が実装を書き切れる粒度になっている状態」

**判定: ゲート③は現状では通せない。** 重要度A 7件のうち A1・A2・A4 は「設計書どおり実装すると動かない/実装できない」種類の欠陥であり、クローズが必須。

---

## 重要度A(必須)

### A1. 文字種 enum の値が logic-spec と DB/API で食い違っている(「長音ー」と「長音」)

- 対象ファイル・箇所: `romaji-automaton.md` 3章(`文字種 // 清音 | 拗音 | 撥音ん | 促音っ | 長音ー`)、同 6.1(`もし 拍の文字種 == 長音ー`)、5章の見出し語。対比: `db-access.md` 1章(`CharType { 清音, 拗音, 撥音ん, 促音っ, 長音 }`)、`table-definition.md` TBL-05/TBL-06(`CHECK IN ('清音','拗音','撥音ん','促音っ','長音')`)、`api-spec.yaml` `MissRecordInput.charType` / `KanaCountInput.charType` / `MissAnalysis.byCharType.charType`(いずれも `enum: [清音, 拗音, 撥音ん, 促音っ, 長音]`)
- 指摘内容: 同じ概念(文字種タグ)に `長音ー` と `長音` の2つのリテラルが使われている。この値はフロントエンドの判定エンジン(`romaji-automaton.md` を実装)が生成し、`MissRecordInput.charType` としてそのまま API に載り、CHECK 制約付きのカラムへ保存される。`db-access.md` 1章は「Java enum の定数名を DB の CHECK 制約・API 仕様の enum 値と同じ文字列にする」と明記しており、変換テーブルを持たない設計になっているため、判定エンジンが `長音ー` を送ると 400(enum 外)または CHECK 制約違反で 500 になる。`romaji-automaton.md` 2章自身も「長音「ー」」と書いており、3章の `長音ー` は文書内でも揺れている。`advice-generation.md` 2章の tie-break 定義順は `長音` 側を使っており、logic-spec 内でも不統一。
- 推奨対応: `romaji-automaton.md` 3章・5.3・6.1 の文字種リテラルを `長音` に統一する(かな表記としての「ー」と、文字種タグ名としての「長音」を明確に分ける)。あわせて `glossary.md` の文字種5分類の表記も同じ語で揃っているか確認する。

### A2. 404(userId / topicSetId 不在)の判定責務がどのクラスにも割り当てられていない。かつ sequence.md 3章が class-design 1.5 と矛盾する

- 対象ファイル・箇所: `class-design.md` 1.4「例外・エラーハンドリング」(`UserNotFoundException` / `TopicSetNotFoundException` の定義のみ)、同 1.5 FR-08/FR-09 行、`sequence.md` 2章・3章・4章、`db-access.md` 4.1・4.2
- 指摘内容:
  1. `api-spec.yaml` は `GET /api/users/{userId}/sessions` / `/best` / `/miss-analysis` および `POST /api/sessions` について「userId(または topicSetId)が存在しない場合は404」と定めているが、P3 のどの文書にも**誰が存在確認を行うか**が書かれていない。`db-access.md` 4.2 の自己ベストクエリは利用者が存在しない場合も0件の場合も等しく null を返すため、このクエリ結果だけでは 404 と「記録なし(null を返す 200)」を区別できない。存在確認用のメソッド(`UserRepository.existsById` 等)が 4.1 の一覧にも無い。結果として、実装者は `UserNotFoundException` を投げる場所とタイミングを設計書から決められない。
  2. `sequence.md` 2章(FR-08)・3章(FR-09)は `Controller → Repository` を直接呼ぶ図になっているが、`class-design.md` 1.5 の FR-09 行は `SessionController`/`SessionService`/`SessionRepository` の3層を割り当てている。層構成が2文書で食い違っており、Service を経由するのかしないのかが一意に決まらない。4章(FR-10/11)は Service を経由しているため、図の中でも扱いが不統一。
- 推奨対応: (a) `class-design.md` 1.4 に「userId/topicSetId の存在確認は各 Service の入口で行い、不在なら `UserNotFoundException`/`TopicSetNotFoundException` を投げる」と責務を明記し、`db-access.md` 4.1 に `existsById` 相当を追加する。(b) `sequence.md` 2章・3章に Service を participant として追加し、存在確認 → クエリ → DTO 変換の順序を図に反映する(または class-design 1.5 側を Controller+Repository の2層に統一する。どちらでもよいが2文書を揃える)。

### A3. `session-metrics.md` の入出力構造が `class-design.md` の `SessionMetricsInput`/`SessionMetricsResult` と一致していない

- 対象ファイル・箇所: `session-metrics.md` 1章(`構造体 セッション入力(SessionInput)`)・3章(`構造体 セッション結果(SessionResult)`)・2.1、`class-design.md` 1.3 の表および直後の「設計判断」
- 指摘内容: 3点の不一致がある。
  1. **フィールドの不一致**: logic-spec は入力に `missRecords`(ミス記録の配列)を取り、2.1 で「missRecords の要素数」を使う形で書かれている。一方 `class-design.md` は「typing-core を api 側 DTO に依存させない」という設計判断で `missRecordCount`(int)のみを受け取ると決めている。`sequence.md` 1章の `Svc->>Calc: calculate(correctKeyCount, missRecordCount, ...)` は class-design 側に従っている。logic-spec だけが取り残されており、疑似コードをそのまま実装すると class-design と異なるシグネチャになる。
  2. **型名の不一致**: `SessionInput` / `SessionResult` と `SessionMetricsInput` / `SessionMetricsResult`。`class-design.md` 冒頭は「クラス構成に迷わず書き始められること」を目的に掲げており、同じ型に2つの名前がある状態は目的に反する。
  3. **名前の衝突**: logic-spec の `SessionResult` は `api-spec.yaml` の `components.schemas.SessionResult`(sessionId/playedAt/previousBest/isNetKpmBest 等を含む API レスポンス)と同名だが中身が違う。`class-design.md` 1.4 の DTO 命名規則では後者が `SessionResultResponse` になるため、`SessionResult` という語が3通りに解釈できる。
- 推奨対応: `session-metrics.md` 1章・3章の構造体名を `SessionMetricsInput` / `SessionMetricsResult` に改め、入力フィールドを `missRecordCount` に変更する(2.1 の「missRecords の要素数」も同様に書き換える)。CL-003/CL-008 と同型の「下流で決めた内容を関連文書へ戻していない」再発なので、`change-log.md` にも記録する。

### A4. `kanaOccurrenceNo` / `kanaCounts` / `correctKeyCount` / `keystrokeIntervalsMs` の生成責務と算出規則がどの文書にも無い

- 対象ファイル・箇所: `romaji-automaton.md` 6.1「ミスを記録する」・7章の対応表、`class-design.md` 2.2・2.4、`sequence.md` 1章(`View->>Store: 正誤・ミス記録を蓄積`)
- 指摘内容: `api-spec.yaml` の `SessionSubmission` は `correctKeyCount` / `keystrokeIntervalsMs` / `missRecords[].kanaOccurrenceNo` / `kanaCounts[]` を必須としており、`table-definition.md` TBL-05・TBL-06 と `db-access.md` 4.3 のミス分析(分子=拍単位ミス、分母=かな出現回数)はこれらに全面的に依存している。しかし:
  - `romaji-automaton.md` 6.1 の `ミスを記録する` が渡す項目は5つ(対象拍/期待キー候補/実際キー/直前拍/文字種タグ)で、`kanaOccurrenceNo` が含まれない。7章の FR-04 対応表にも無い。「同一セッション内でそのかなが何回目に出現したか」を誰がどう数えるか(出題された拍を数えるのか、確定した拍を数えるのか)がどこにも定義されていない。これは `db-access.md` 4.3 の `DISTINCT ON (session_id, kana, kana_occurrence_no)` が正しく機能するための前提そのものである。
  - `kanaCounts`(TBL-06、ミス率・正解率の分母)の集計主体も同様。`class-design.md` 2.4 は `sessionStore` が「かな出現回数」を保持すると書きつつ、同節末尾で「Pinia store 自体はロジックを持たず記録のみを行う」と述べており、集計ロジックの置き場所が矛盾している。`judgment-engine` 側のモジュール表(2.2)にも出現回数の責務は無い。
  - `correctKeyCount` の数え方(正しいキー1打=1、押し戻されたキーの扱い)、`keystrokeIntervalsMs` の計測点(keydown 間か、確定時か)、`durationSeconds` の起点も未定義。`session-metrics.md` は「与えられた前提」で書かれているため、生成側の空白が誰にも埋められていない。
- 推奨対応: `romaji-automaton.md` に「拍を確定した/出題した時点でかなごとの出現連番を採番し、ミス記録に付与する」規則を追加するか(判定エンジン側の責務とするのが自然)、`class-design.md` 2.2 に採番・出現回数集計を担うモジュール(例: `sessionRecorder.ts`)を新設して責務を明示する。あわせて `correctKeyCount`・`keystrokeIntervalsMs`・`durationSeconds` の計測定義を1箇所(推奨は `class-design.md` 2.4 か `sequence.md` 1章の Note)に書く。

### A5. `romaji-automaton.md` が `class-design.md` に委譲した表示ロジックの受け皿が無く、`KeystrokeResult` も未定義

- 対象ファイル・箇所: `romaji-automaton.md` 6.1 末尾「FR-03(リアルタイム表示)との対応」(「表記ゆれのうちどれを画面ヒントに出すかは `class-design.md` の表示ロジック側で決める」)、`class-design.md` 2.2・2.6 `TypingDisplay.vue`
- 指摘内容:
  1. 上記の申し送り先である `class-design.md` には、候補集合から画面ヒント用の1パターンを選ぶ規則が**書かれていない**。`TypingDisplay.vue` の責務欄は「`KeystrokeResult` を確定済み文字・次に打つ文字・ミス位置の表示に変換」とあるだけで、`{si, shi, ci}` のうち何を出すかは決まっていない。申し送りが宙に浮いている(P1→P3 で繰り返し指摘されている「下流に投げたまま回収しない」パターン)。
  2. `KeystrokeResult` は `class-design.md` 2.2 で「確定済み文字・次の候補・ミス有無を持つ」と一文あるだけで、フィールドが定義されていない。さらに `romaji-automaton.md` 6章の疑似コードは `キー = 次のキー入力を待つ` というブロッキングループ形式で書かれているのに対し、`class-design.md` は `moraJudge.ts` を「キー入力を1つずつ受け取り `KeystrokeResult` を返す」ステップ関数として定義している。ループ形式からイベント駆動への反転にあたり、キー入力をまたいで保持すべき状態(`入力済み文字列` / `候補集合` / `保留中の確定候補` / `直前に確定した拍` / `次拍への絞り込み候補` / `持ち越しキー`)を `moraJudge` と `sequenceJudge` のどちらが持つかが定義されていない。2.2 は sequenceJudge が「押し戻し・促音の絞り込み結果」を持つとだけ書いており、`保留中の確定候補` の所在が不明。本アプリの中核ロジックであり、この状態で実装に渡すと設計と別物になるリスクが高い。
- 推奨対応: `class-design.md` 2.2 に (a) 画面ヒントのパターン選択規則(例: 受理表の先頭パターンを既定とし、入力が始まったら候補集合の残存パターンの先頭を使う)、(b) `KeystrokeResult` のフィールド一覧、(c) `moraJudge`/`sequenceJudge` が保持する状態の分担、の3点を追記する。あわせて `romaji-automaton.md` 6章に「本疑似コードのループは概念表現であり、実装は1キーごとに呼ばれるステップ関数へ変換する」旨の注記を入れる。

### A6. `class-design.md` 2.7 が `sequence.md` に委譲した「遷移ガード」が sequence.md に無いのに、sequence.md は「未決事項なし」と宣言している

- 対象ファイル・箇所: `class-design.md` 2.7(「遷移ガード(userId未設定時にS-01へ強制)の実装は `sequence.md` で確定する」)、`sequence.md` 5.2・6章(「未決事項: なし」)
- 指摘内容: `sequence.md` 5.2 が扱っているのは「API が **404** を返した(=userId が失効していた)」ケースであり、`screen-design.md` 2章が定めるもう一方の導線「起動時に localStorage を読み出し、値が**無い**場合のみ S-01 を経由する」= ルーターガードのシーケンスは書かれていない。にもかかわらず `sequence.md` 6章は「未決事項: なし」と宣言しており、未回収の申し送りが台帳上は消えた形になっている。加えて `class-design.md` 2.9 の未決事項2件も、`sequence.md` 作成後に「解決済み」へ更新されていない。
- 推奨対応: `sequence.md` に「起動時の userId 復元とルーターガード(localStorage 読み出し → 有無で S-02/S-01 へ分岐)」のシーケンスを1本追加する。あわせて `class-design.md` 2.9 を解決済み表記に更新する。なお 5.2 末尾の「具体的な実装(共通エラーハンドラをどこに置くか)はP5で決める」は 6章「未決事項なし」と整合しないため、6章に P5 送りとして1行残す。

### A7. P3 で確定した内容が `api-spec.yaml` / `table-definition.md` の該当箇所へ反映されておらず「未決」のまま残っている

- 対象ファイル・箇所: `api-spec.yaml` `MissRecordInput.expectedKey` の description(「複数候補があるときにどの表記由来のキーを記録するかは P3 `logic-spec/romaji-automaton.md` の受理表確定と合わせて定める(未決事項)」)、同 `SessionResult.consistency` の description(「統計量の定義(標準偏差か変動係数か)はP3で確定する暫定値」)、`table-definition.md` TBL-05 `expected_key` のカラム説明(「…どの表記由来のキーを記録するかは未決事項(下記参照)」)
- 指摘内容: `db-access.md` 3章は expected_key を「カンマ区切り・アルファベット順の文字列」と確定し、`session-metrics.md` 2.5 は Consistency を標準偏差[ms]と確定している。`change-log.md` CL-008/CL-010 は上流を更新したと記録しているが、実際には上記3箇所が未更新のまま残っている(`table-definition.md` は末尾の「未決事項」リストだけが解決済みに更新され、カラム説明の本文が取り残されている)。CL-003 → CL-008 → 今回で3度目の同型再発であり、「api-spec.yaml は fixed だから読めば正しい」と信じて実装した場合に誤った理解に至る。
- 推奨対応: 上記3箇所を確定内容に書き換え(expectedKey は「複数候補時はアルファベット順カンマ区切り。`db-access.md` 3章」、consistency は「打鍵間隔の母標準偏差[ms]。`logic-spec/session-metrics.md` 2.5」)、`change-log.md` に CL-011 として記録する。あわせて、未決事項を解決する際は「末尾の未決事項リスト」だけでなく**本文・description の該当記述も**検索して直す、という手順を運用ルール側に足すことを推奨する(3度目の再発は個人の注意では止まっていない)。

---

## 重要度B(推奨)

### B1. カンマ区切りの `expectedKey` が `byErrorPattern` の集計キーとアドバイス文面に与える影響が未確定

- 対象ファイル・箇所: `db-access.md` 3章・4.3(誤りパターン別クエリの `GROUP BY mr.expectedKey, mr.actualKey`)、`advice-generation.md` 3章 `pattern` テンプレート
- 指摘内容: `expected_key` が `"c,s"` のような複合値になると、`byErrorPattern.expectedKey` もその値になり、アドバイス文が「"c,s"を"x"と入力してしまうミスが目立ちます」という不自然な文になる。`db-access.md` 3章は「分析側(P5実装)で必要なら先頭要素だけを見ることもできる」と選択肢を残しているが、P3 の完了条件(設計書だけで実装を書き切れる)に照らすと未確定のまま。集計キーの粒度が変わればテストケース(P4)にも影響する。
- 推奨対応: `db-access.md` 4.3 に「byErrorPattern の集計・表示では expectedKey の先頭要素のみを使う」あるいは「複合値のまま表示する」のどちらかを明記し、`advice-generation.md` 3章のテンプレートに埋め込む値を対応させる。

### B2. `byKana` の「多い順」のソートキーが未定義で、アドバイス出力が非決定になる

- 対象ファイル・箇所: `advice-generation.md` 2章(`対象 = byKana[0]`、`byErrorPattern[0]`)、`api-spec.yaml` `MissAnalysis.byKana`(「多い順」)、`db-access.md` 4.3、`class-design.md` 1.4 `MissAnalysisService`
- 指摘内容: `byKana` の要素は `missCount` と `missRate` の2値を持つが、「多い順」がどちらを指すかが定義されていない。アドバイス生成は `byKana[0]` を唯一の判定対象にしているため、ソートキーが変わるとアドバイス内容が変わる。また、ソートを行う責務(Service か Repository クエリか)がどの文書にも書かれていない。
- 推奨対応: `db-access.md` 4.3 または `class-design.md` 1.4 に「4観点のソートは `MissAnalysisService` が行う。byKana は missCount 降順(同値なら missRate 降順)」のように明記する。

### B3. `class-design.md` 冒頭の「2章: フロントエンド(P3-05、未着手)」が本文と矛盾

- 対象ファイル・箇所: `class-design.md` 12行目
- 指摘内容: 2章は 2.1〜2.9 まで書き切られているのに、冒頭の構成案内が「未着手」のまま。実装者が2章を未完成と誤解する。
- 推奨対応: 「2章: フロントエンド(P3-05)」に修正する。

### B4. `sequence.md` 1章の層表現が class-design の構成と合っていない

- 対象ファイル・箇所: `sequence.md` 1章(`Store->>Ctrl: POST /api/sessions`、`Repo-->>Ctrl: SessionResult`)
- 指摘内容: (a) `class-design.md` 2.3 で `sessionApi.ts`(および共通 `client.ts`)を API 呼び出しの担当と定めているのに、1章では `sessionStore` が Controller を直接叩く図になっている。5.2 では `Api` を participant に立てており、図ごとに粒度が違う。(b) `Repo-->>Ctrl: SessionResult` は、永続化層が API レスポンス DTO を返す形になっており層責務に反する(`Svc-->>Ctrl` が正しい)。
- 推奨対応: 1章に `sessionApi` を participant として追加し、返却は `Svc-->>Ctrl: SessionResult` に直す。

### B5. `system-architecture.md` を CL-009 で改訂したのに frontmatter の `updated` が古いまま

- 対象ファイル・箇所: `system-architecture.md` frontmatter(`updated: 2026-08-26`)、3章 FR 対応表(typing-core 行に FR-11 が追加済み)、`class-design.md` 1.2
- 指摘内容: CL-009 の変更(2026-08-29)は本文に反映されているが `updated` が更新されていない。CLAUDE.md は `doc_id`/`status`/`updated` の維持を求めており、更新日で変更有無を判断できなくなる。
- 推奨対応: `updated: 2026-08-29` に更新する。

### B6. Entity ↔ DTO の変換責務が未定義

- 対象ファイル・箇所: `class-design.md` 1.4「DTO」、`sequence.md` 2章(`Repo-->>Ctrl: List<Session>` → `Ctrl-->>View: 200 List<SessionSummary>`)
- 指摘内容: 「Entity をそのままレスポンスに使わない」方針は明記されているが、変換をどの層で行うか(Controller / Service / 専用 Mapper)が決まっていない。図では Controller が変換しているように読めるが、4章では Service が DTO(`MissAnalysis`)を組み立てている。実装者が層ごとにバラバラの流儀で書くことになる。
- 推奨対応: `class-design.md` 1.4 に「Entity → Response DTO の変換は Service が行い、Controller は受け渡しのみ」等の1行を追加する。

### B7. 日本語の enum 定数名(`CharType.清音`)の採用リスクが検討されていない

- 対象ファイル・箇所: `db-access.md` 1章
- 指摘内容: Java 識別子として構文上有効という判断は正しいが、代替案(`@JsonValue`/`AttributeConverter` によるマッピング)との比較が書かれていない。Checkstyle 等の静的解析、IDE 補完、エンコーディング事故(ファイルが UTF-8 でない環境)といった実務リスクへの言及がなく、他の設計判断メモ(却下案と理由を書く形式)と粒度が揃っていない。`EndConditionType { sentence_count, time_limit }` も Java の命名規約(定数は大文字)から外れる。
- 推奨対応: 現状の判断を維持してよいが、`db-access.md` 1章に却下案(変換用アノテーション方式)とその見送り理由を1行足し、他の設計判断メモと形式を揃える。あわせてビルド設定で日本語識別子が問題にならないことを P5 冒頭で確認する旨を申し送る。

### B8. FR-05(終了条件判定)・FR-01(お題ローテーション)のロジック所在が表のセル止まり

- 対象ファイル・箇所: `class-design.md` 2.4・2.8、`sequence.md` 1章の Note(「終了条件達成まで繰り返し」)
- 指摘内容: FR-05 は `system-architecture.md` 3章でフロントエンドの判定エンジン層に割り当てられているが、`class-design.md` では `sessionStore`/`TypingView` のセルに ID が並ぶだけで、「お題 N 文完了」「制限時間経過」をどのモジュールがどう判定するか(タイマーの所在、途中離脱時の扱い)が書かれていない。FR-01 受け入れ条件の「セット内でのローテーション/再利用」も、次のお題を選ぶロジックの所在が未定義(`topicStore` はお題文一覧の保持のみ)。いずれも logic-spec は不要な軽さだが、担当モジュールと規則は P3 で決めておきたい。
- 推奨対応: `class-design.md` 2.4 の `sessionStore` 責務に終了条件判定とお題ローテーションの規則(例: 一覧を先頭から順に使い、末尾に達したら先頭へ戻る)を1〜2行で追記する。

### B9. `byKana` に `occurrenceCount` が無く、アドバイス側が除算で分母を逆算している

- 対象ファイル・箇所: `advice-generation.md` 2章(`総出現回数(推定) = 対象.missCount ÷ (対象.missRate ÷ 100)`)、`api-spec.yaml` `MissAnalysis.byKana`
- 指摘内容: CL-007 で `byCharType` には `occurrenceCount` を追加したのに、`byKana` は逆算のままで対称性が無い。`db-access.md` 4.3 の分母クエリで実値を持っているため、逆算は不要な精度劣化(missRate は丸め済みの可能性がある)と 0 除算リスクを持ち込む。
- 推奨対応: `api-spec.yaml` の `byKana` に `occurrenceCount` を追加し、`advice-generation.md` の推定式を実値参照に置き換える(CL-007 と同じ対応)。実施する場合は `change-log.md` への記録が必要。

---

## 重要度C(参考)

### C1. `session-metrics.md` の章参照が2箇所誤っている

- 箇所: 2.2 のコメント「// 5章「ゼロ除算」参照」、5章の「既定値(5章参照)」
- 内容: ゼロ除算・既定値の根拠は 4章 設計判断メモ #3。5章は `shared/testdata` への申し送り。「5章参照」の自己参照も含めて 4章 に直す。

### C2. `db-access.md` 4.3 末尾の「(1.4節どおりServiceの責務)」が自文書の節番号と紛らわしい

- 内容: 指しているのは `class-design.md` 1.4。db-access.md には 1.4 節が無いため、文書名を明記する。9行目の「`class-design.md` 1.4節のRepository/Entity一覧」と同じ書き方に揃える。

### C3. `db-access.md` 4.3 の用語と DISTINCT ON の非決定性

- 内容: 「PostgreSQL のタプル DISTINCT」は正しくは `DISTINCT ON`。また `DISTINCT ON` は `ORDER BY` を伴わないと同一グループ内のどの行が返るか未定義(本件は取得列が全て同一値のため実害なし)。仕様の意図を明確にするため `ORDER BY mr.session_id, mr.kana, mr.kana_occurrence_no` を付ける。

### C4. `class-design.md` 2.2 の表の並び順が章番号と逆

- 内容: `moraJudge.ts`(6.1)が `sequenceJudge.ts`(6.0)より前に並んでいる。外側→内側の順に並べ替えると読みやすい。

### C5. 同じ概念に別名がある(`MissRecord` と `MissRecordInput`)

- 箇所: `class-design.md` 2.2 `types.ts` の `MissRecord`、2.3 `types/api.ts` の API 型
- 内容: judgment-engine のミス記録型と API 送信用型が別名で共存する。意図的な分離(判定エンジンを API 契約に依存させない)なら、その旨を1行注記しておくと実装時の混乱を防げる。

### C6. `sequence.md` 1章の mermaid の `activate`/`deactivate` 位置

- 内容: `activate Svc` が `Ctrl->>Svc` より前、`deactivate Svc` が Repo からの応答より前に置かれており、活性期間の表現が実際の呼び出し順とずれている。図の意味は伝わるので P5 前に直せば十分。

### C7. P3 3文書の status が `draft` のまま

- 箇所: `class-design.md` / `sequence.md` / `db-access.md` の frontmatter、`_index.md` 30_detail-design 表
- 内容: ゲート③の指摘対応後、6文書とも `fixed` に更新し、`_index.md` のレビュー欄に本レビューへのリンクを追加する。

### C8. `requirements.md` NFR-08 が charter.md 6章・system-architecture.md 6章と矛盾している(P3対象外・申し送り)

- 内容: `requirements.md` NFR-08 は「Render Managed Postgres の標準バックアップ機能に委ねる」のままだが、`charter.md` 6章と `system-architecture.md` 6章は「無料プランはバックアップ非対応・30日で失効。受入リスク」と 2026-08-29 に確定している。P3 の対象文書ではないが、A7 と同じ「下流の確定を上流へ戻していない」パターン。次に requirements.md を触る機会に合わせて修正を推奨。

### C9. `class-design.md` 1.5 に FR-02 / FR-03 の行が無い

- 内容: バックエンドに該当が無いためだが、表から ID が消えていると「漏れ」なのか「該当なし」なのか判別できない。`table-definition.md` の FR-ID 対応表のように「FR-02 | (なし) | フロントエンド完結(ADR-002)」の行を足すとトレースが閉じる。

---

## 観点別の総括

**1. トレーサビリティ**: FR-01〜FR-13 は `class-design.md` 1.5・2.8 の2つの対応表で網羅されており、上位 ID(FR)への参照は基本的に正しい。TBL-01〜06 も Entity/Repository と1:1で対応が取れている。ただし、(a) 404 判定という API 仕様上の要求がどのクラスにも紐づいていない(A2)、(b) `romaji-automaton.md` → `class-design.md`、`class-design.md` → `sequence.md` の相互申し送りが受け皿側で未回収(A5・A6)、(c) P3 の確定内容が P2 文書へ戻っていない(A7)、の3系統で参照が切れている。FR-02/FR-03 のバックエンド側「該当なし」明記も欲しい(C9)。

**2. charter.md との整合性**: 問題なし。MVP スコープ 3.1 の8項目はいずれも FR 経由でクラス・クエリまで落ちており、漏れは無い。3.2 のスコープ外リスト(認証・ランキング・お題投稿・英語モード・かな入力・モバイル対応・テーマ切替・SNS共有・自動お題生成・自由入力モード)に抵触する記述も混入していない。`db-access.md` 1章が単方向 `@ManyToOne` のみに限定した理由付け(「親から子を辿る FR が存在しない」)は、現行スコープに正しく紐づいた判断で良い。

**3. 内部矛盾・曖昧さ**: ここが本レビューの主要な検出領域。文字種 enum のリテラル揺れ(A1)は DB の CHECK 制約に直撃する実害のある矛盾。`SessionInput`/`SessionMetricsInput` の名前・フィールド不一致(A3)、`sessionStore` の「かな出現回数を持つ」と「ロジックを持たない」の自己矛盾(A4)、`sequence.md` 内の層表現の不統一(A2・B4)、`byKana` の「多い順」の未定義(B2)がいずれも実装者の解釈を分岐させる。

**4. 完了条件の充足**: 「設計書だけで実装を書き切れる粒度」には**未達**。特にフロントエンドの中核である判定エンジン周辺が、`KeystrokeResult` のフィールド未定義・状態保持の分担未定義・ヒント表示規則の未定義(A5)、および `kanaOccurrenceNo`/`kanaCounts`/`correctKeyCount`/`keystrokeIntervalsMs` の生成規則の欠落(A4)により、設計書だけでは書き始められない。バックエンド側は Controller/Service/Repository/Entity/クエリ/インデックス/トランザクション境界まで揃っており、404 判定と DTO 変換責務(A2・B6)を足せばほぼ充足する。`db-access.md` は未決事項2件(expected_key・インデックス)を実際に解決しており、空セクション・TBD の残存は無い。

**5. 過剰・スコープ超過**: 問題なし。むしろ完走優先の方針(charter 6章)と整合した抑制が効いている。`class-design.md` 2.6 が再利用コンポーネントを代表3件に絞って残りを P5 送りにした判断、1.4 が DTO クラス名を列挙せず命名規則の宣言に留めた判断、`db-access.md` 6章がインデックスを4本に絞り Flyway への反映を P5 送りにした判断は、いずれも P3 の粒度として適切。`db-access.md` 4.3 が集計を Service 側の再集計に寄せたのも、複雑な SQL を避ける方向で妥当。P2/P3 へ差し戻すべき過剰設計は見当たらない。

---

## 先送りしてよいと判断した項目(P4/P5 送り)

- 共通エラーハンドラの物理的な置き場所(`sequence.md` 5.2 が P5 送りとしている)— 責務と発火条件が図で確定していれば P3 としては十分。ただし 6章「未決事項なし」の表記だけは直す(A6)。
- 具体的なテストベクタの中身(3つの logic-spec がいずれも P4 送りと明記)— 申し送り内容が観点レベルで具体的に書かれており、P4 の入力として機能する。
- Flyway マイグレーションのファイル分割、ボタン等の小コンポーネント、ビジュアルデザイン — いずれも明示的に P5 送りと書かれており妥当。
- アドバイス生成の閾値の妥当性(暫定値)— `advice-generation.md` 設計判断メモ #3 が P6/P8 での調整を前提と明記しており、MVP として適切な割り切り。
