---
doc_id: DD-001
status: fixed
updated: 2026-09-10
---

# クラス設計

実装者(Claude)がこの文書だけを見てクラス構成に迷わず書き始められることを目的とする。メソッドの中身(業務ロジックの手順)は書かない。手順は `logic-spec/` の各仕様、または P3-07 `sequence.md` に譲る。

- 1章: バックエンド(P3-04)
- 2章: フロントエンド(P3-05)

---

## 1. バックエンド(P3-04)

### 1.1 モジュール構成の理由

`typing-core` と `api` を分けるのは [system-architecture.md](../20_basic-design/system-architecture.md) 4章の取り決めどおり、次の2点のため。

1. **P9(多言語移植)への備え**: `typing-core` は Spring / JDBC / HTTP / ファイルIO を import しない純粋ロジックに限定し、移植対象をこのモジュールだけに閉じる
2. **テストのしやすさ**: `shared/testdata` の入出力パターンだけでテストでき、DB・HTTPのモック構築が不要になる

### 1.2 設計判断: FR-11(改善アドバイス生成)を `typing-core` に含める

`system-architecture.md` のFR対応表は当初 typing-core 行を FR-06 のみとしていたが、[`logic-spec/advice-generation.md`](./logic-spec/advice-generation.md) は `session-metrics.md`(FR-06)と同じ「言語非依存の疑似コード」として書かれており、`shared/testdata` での検証対象にもなる。**同じ扱いにするのが一貫している**と判断し、typing-core に含める。`system-architecture.md` の該当行を本タスクで修正し、`change-log.md` に CL-009 として記録する。

一方、FR-10(ミス傾向4観点の集計: byKana/byErrorPattern/byPrevKana/byCharType)には専用の logic-spec が無く、`system-architecture.md` が元々 Repository(永続化層)の責務としているため、**typing-core には含めず据え置く**(1.4節参照)。

### 1.3 `backend/typing-core`(パッケージ `dev.kazuki.typingapp.core`)

| クラス | 種別 | 責務 | 対応FR | 出典 |
|---|---|---|---|---|
| `SessionMetricsCalculator` | クラス(静的メソッド) | Net/Raw KPM・正確率・Consistencyを算出 | FR-06 | `logic-spec/session-metrics.md` |
| `SessionMetricsInput` | record | 算出入力。`correctKeyCount`, `missRecordCount`(int), `keystrokeIntervalsMs`(int[]), `durationSeconds` | FR-06 | 同上 |
| `SessionMetricsResult` | record | 算出結果。`netKpm`, `rawKpm`, `accuracy`, `consistency`, `durationSeconds`(いずれも小数第2位で丸め済み) | FR-06 | 同上 |
| `AdviceGenerator` | クラス(静的メソッド) | 3カテゴリを独立判定し、0〜3件のアドバイス文を生成 | FR-11 | `logic-spec/advice-generation.md` |
| `MissAnalysisInput` | record | アドバイス生成の入力。`byKana`(List\<KanaMissStat\>), `byErrorPattern`(List\<ErrorPatternStat\>), `byCharType`(List\<CharTypeStat\>)。`byPrevKana` はアドバイス生成に使わないため含めない | FR-11 | 同上 |
| `KanaMissStat` | record | `kana`, `missCount`, `occurrenceCount`, `missRate` | FR-11 | 同上(2026-08-30 CL-016で`occurrenceCount`追加) |
| `ErrorPatternStat` | record | `expectedKey`, `actualKey`, `count` | FR-11 | 同上 |
| `CharTypeStat` | record | `charType`, `occurrenceCount`, `accuracyRate` | FR-11 | 同上 |

**設計判断:** `SessionMetricsInput` は `api-spec.yaml` の `SessionSubmission.missRecords`(配列全体)を渡さず、**要素数(`missRecordCount`)のみ**を受け取る。`session-metrics.md` の算出式が使うのは「ミス記録の総数」だけであり、個々のミス記録の中身(`kana`/`expectedKey`等)は集計計算に不要なため、typing-core を `MissRecordInput` という api 側DTOの形に依存させないための境界線。

### 1.4 `backend/api`(パッケージ `dev.kazuki.typingapp.api`)

Controller → Service → Repository の3層構成。例外→HTTP応答の変換は `GlobalExceptionHandler` 1箇所に集約する(`system-architecture.md` 3章、NFR-07)。

#### Controller

| クラス | 担当API | 対応FR |
|---|---|---|
| `UserController` | `POST /api/users` | FR-12 |
| `TopicSetController` | `GET /api/topic-sets`, `GET /api/topic-sets/{topicSetId}/sentences` | FR-01, FR-13 |
| `SessionController` | `POST /api/sessions`, `GET /api/users/{userId}/sessions`, `GET /api/users/{userId}/best` | FR-05〜09 |
| `MissAnalysisController` | `GET /api/users/{userId}/miss-analysis` | FR-10, FR-11 |

#### Service

| クラス | 責務 | 対応FR |
|---|---|---|
| `UserService` | find-or-create、name のバリデーション(trim後1〜100文字) | FR-12 |
| `TopicSetService` | お題セット一覧・お題文一覧の取得。お題文一覧取得時はtopicSetIdの存在確認に加え、**取得結果が0件の場合も`TopicSetNotFoundException`(404)を投げる**(`api-spec.yaml` `GET /topic-sets/{id}/sentences`の404条件。2026-08-29 ゲート③検証レビューREV-013 A6対応) | FR-01, FR-13 |
| `SessionService` | userId/topicSetId の存在確認 → リクエストの値域チェック → `SessionMetricsCalculator` 呼び出し → `@Transactional` で結果・ミス記録・かな出現回数を保存 → 自己ベスト比較(`isNetKpmBest`/`isAccuracyBest`)。保存前のMAXクエリが両方nullの場合(初回セッション)、`SessionResult.previousBest`は`null`とし`isNetKpmBest`/`isAccuracyBest`は`true`にする(2026-08-29 REV-013 B7対応)。履歴一覧(FR-08)取得時も Repository から Entity を受け取り DTO へ変換する | FR-04〜09 |
| `MissAnalysisService` | userId の存在確認 → Repositoryから全期間のミス記録・かな出現回数を取得し4観点に集計 → `AdviceGenerator` 呼び出し | FR-10, FR-11 |

集計クエリの具体的な実装方針(JPQL/ネイティブクエリ、インデックス)は P3-06 `db-access.md` で確定する。

**Service メソッドシグネチャ(2026-08-30、P4-01 test-reviewer B1対応で確定):** UT ケース ID を「クラス×メソッド×条件」で採番できるようにするため、Controller が呼ぶ Service メソッドの引数・戻り値を確定する。型名は 1.4 上部の DTO 変換規則(`api-spec.yaml` のスキーマ名 → PascalCase + Request/Response サフィックス)に従う。Controller メソッドは対応する Service メソッドをそのまま1回呼ぶだけの薄い層のため、シグネチャは Service 側のみ列挙する。

| Service | メソッド | 引数 | 戻り値 | 対応FR |
|---|---|---|---|---|
| `UserService` | `identifyUser` | `name: String` | `UserResponse` | FR-12 |
| `TopicSetService` | `listTopicSets` | (なし) | `List<TopicSetResponse>` | FR-13 |
| `TopicSetService` | `listSentences` | `topicSetId: Long` | `List<SentenceResponse>` | FR-01, FR-13 |
| `SessionService` | `submitSession` | `request: SessionSubmissionRequest` | `SessionResultResponse` | FR-04〜09 |
| `SessionService` | `listSessionHistory` | `userId: Long` | `List<SessionSummaryResponse>` | FR-08 |
| `SessionService` | `getPersonalBest` | `userId: Long, topicSetId: Long` | `PersonalBestResponse` | FR-09 |
| `MissAnalysisService` | `getMissAnalysis` | `userId: Long` | `MissAnalysisResponse` | FR-10, FR-11 |

メソッド名は `api-spec.yaml` の `operationId` と同名にする(Controller→Service の対応関係を1:1で追える)。`submitSession`は`userId`/`topicSetId`をリクエストボディ(`SessionSubmissionRequest`)のフィールドとして受け取り、個別の引数には分解しない(`api-spec.yaml`の`SessionSubmission`スキーマと一致させるため)。

**存在確認の責務(2026-08-29、ゲート③ doc-reviewer A2/test-reviewer A6対応で確定):** userId・topicSetId を受け取る全エンドポイントで、対応する Service の入口(メソッドの最初)で存在確認を行う(`db-access.md` 4.1 の `existsById` 相当を使う)。存在しなければ `UserNotFoundException`/`TopicSetNotFoundException` を投げる。**両方が存在しない場合は userId を先に判定する**(パスパラメータであり、判定順序を先にするのが自然なため)。`UserService`/`TopicSetService` も同様に自分が担当するリソースの存在確認を自分の入口で行う。

**Entity→DTO変換の責務:** Controller は変換を行わず、受け渡しのみを行う。Entity → Response DTO の変換は各 Service が行う(4章で組み立てる `MissAnalysis` と同じ扱いに統一)。

#### Repository(Spring Data JPA)

| クラス | 対応テーブル |
|---|---|
| `UserRepository` | TBL-01 users |
| `TopicSetRepository` | TBL-02 topic_sets |
| `SentenceRepository` | TBL-03 sentences |
| `SessionRepository` | TBL-04 sessions |
| `MissRecordRepository` | TBL-05 miss_records |
| `SessionKanaCountRepository` | TBL-06 session_kana_counts |

#### Entity

| クラス | 対応テーブル |
|---|---|
| `User` | TBL-01 |
| `TopicSet` | TBL-02 |
| `Sentence` | TBL-03 |
| `Session` | TBL-04 |
| `MissRecord` | TBL-05 |
| `SessionKanaCount` | TBL-06 |

#### DTO(`dev.kazuki.typingapp.api.dto`)

`api-spec.yaml` の `components.schemas` と1:1対応させる(例: `SessionSubmission` → `SessionSubmissionRequest`、`SessionResult` → `SessionResultResponse`)。Entityをそのままレスポンスに使わず、APIの入出力契約(`api-spec.yaml`)とDBスキーマ(`table-definition.md`)を分離する。個々のDTOクラス名の一覧はここでは列挙せず、`api-spec.yaml` のスキーマ名をJavaの命名規則(PascalCase、Request/Responseサフィックス)に変換したものとする。

#### 例外・エラーハンドリング

| クラス | 責務 |
|---|---|
| `GlobalExceptionHandler`(`@RestControllerAdvice`) | 例外→`ErrorResponse`変換、`traceId`採番、4xx/500時のログ出力(NFR-07) |
| `UserNotFoundException` / `TopicSetNotFoundException` | 404応答に変換(userId・topicSetId不在) |
| `InvalidSessionSubmissionException` | 400応答に変換(値域外、`missRecords[].kana`がkanaCountsに一致しない等。`SessionService.submitSession`専用) |
| `InvalidRequestException` | 400応答に変換(上記以外の単純な入力チェック。例: `UserService`のname長さバリデーション。2026-09-07、P5-07着手時にUserServiceのバリデーション失敗を表す例外が定義されていなかったため追加、CL-019) |

**例外→応答の対応表(2026-08-29、ゲート③ doc-reviewer B2/test-reviewer A6対応で確定):**

| 例外/条件 | HTTPステータス | `code` | ログ |
|---|---|---|---|
| `UserNotFoundException` | 404 | `USER_NOT_FOUND` | WARN 1行(traceId・エンドポイント・userId) |
| `TopicSetNotFoundException` | 404 | `TOPIC_SET_NOT_FOUND` | WARN 1行 |
| `InvalidSessionSubmissionException` | 400 | `VALIDATION_ERROR` | WARN 1行 |
| `InvalidRequestException` | 400 | `VALIDATION_ERROR` | WARN 1行 |
| `MethodArgumentNotValidException`(Bean Validation失敗) | 400 | `VALIDATION_ERROR` | WARN 1行 |
| `HttpMessageNotReadableException`(不正JSON・型不一致) | 400 | `VALIDATION_ERROR` | WARN 1行 |
| `DataIntegrityViolationException`(制約違反) | 500 | `INTERNAL_ERROR` | ERROR + スタックトレース |
| `CannotGetJdbcConnectionException`等(DB接続断) | 500 | `INTERNAL_ERROR` | ERROR + スタックトレース |
| 上記以外の未捕捉例外 | 500 | `INTERNAL_ERROR` | ERROR + スタックトレース |

4xxはWARNで1行(スタックトレース不要)、500のみ従来どおりスタックトレースを出す。`UserService`のfind-or-create競合(`users.name`のUNIQUE制約違反)は`DataIntegrityViolationException`を個別にcatchして`findByName`を再実行し既存ユーザーを返す(このハンドラには到達させない。db-access.md 5章)。

**値域チェック表(`SessionService.submitSession`、2026-08-29 test-reviewer A5対応で確定。違反時はすべて`InvalidSessionSubmissionException`):**

| 項目 | 条件 |
|---|---|
| `endConditionValue` | `endConditionType=sentence_count`のとき1〜50、`time_limit`のとき10〜600(秒)の範囲外 |
| `durationSeconds` | 負値(**0は許容**。制限時間モードで1打鍵も無いままセッションが保存されうるため。`session-metrics.md` 4章判断#3、2026-08-29 ゲート③検証レビューREV-013 A5対応) |
| `correctKeyCount` | 負値 |
| `keystrokeIntervalsMs` | 負値を含む |
| `kanaCounts` | 同一`kana`が重複する |
| `missRecords[].kana` | `kanaCounts`のいずれの`kana`にも一致しない |
| 算出後の`netKpm`/`rawKpm` | `table-definition.md` TBL-04の桁数上限(9999.99)を超える(`SessionMetricsCalculator`の計算自体は失敗させず、呼び出し元でチェックする。`session-metrics.md`参照) |

### 1.5 FR-ID トレーサビリティ

| FR-ID | typing-core | api |
|---|---|---|
| FR-01 | — | `TopicSetController`/`TopicSetService`/`SentenceRepository` |
| FR-04 | — | `SessionService`/`MissRecordRepository` |
| FR-05 | — | `SessionController`/`SessionService`/`SessionRepository` |
| FR-06 | `SessionMetricsCalculator` | `SessionService` |
| FR-07 | — | `SessionService`/`SessionRepository` |
| FR-08 | — | `SessionController`/`SessionService`/`SessionRepository` |
| FR-09 | — | `SessionController`/`SessionService`/`SessionRepository` |
| FR-10 | — | `MissAnalysisController`/`MissAnalysisService`/`MissRecordRepository`/`SessionKanaCountRepository` |
| FR-11 | `AdviceGenerator` | `MissAnalysisController`/`MissAnalysisService` |
| FR-12 | — | `UserController`/`UserService`/`UserRepository` |
| FR-13 | — | `TopicSetController`/`TopicSetService`/`TopicSetRepository` |

---

## 2. フロントエンド(P3-05)

`system-architecture.md` 4章の未決事項(フロントエンドの具体的なフォルダ構成)をここで確定する。

### 2.1 フォルダ構成

```
frontend/src/
  judgment-engine/   … ローマ字判定エンジン(romaji-automaton.md実装、Vue非依存)
  api/               … バックエンドAPIクライアント
  types/             … api-spec.yamlのスキーマに対応するTS型
  stores/            … Pinia(状態管理)
  views/             … 画面(S-01〜S-06、1画面1ファイル)
  components/        … 画面内の再利用パーツ
  router/            … 画面遷移定義
```

`judgment-engine/` を Vue に依存させないのは `typing-core` と同じ理由。将来 P9 で Java へ移植する際の対象を絞り、`shared/testdata` だけでテストできる状態を保つため。

### 2.2 `judgment-engine/`(FR-02, FR-03, FR-04 — `logic-spec/romaji-automaton.md` 実装)

| モジュール | 責務 | 対応する仕様の章 |
|---|---|---|
| `types.ts` | `Mora` / `MoraSequence` / `MissRecord` / `KeystrokeResult`(下記フィールド定義参照) | 3章 |
| `moraPatterns.ts` | 4章の表(清音・拗音)をかな→受理パターンの辞書として持つ | 4章 |
| `specialMora.ts` | 撥音ん・促音っ・長音ーの受理パターン関数(`んの受理パターン` `っの受理パターン` `次の拍の受理パターンを絞り込む` `ーの受理パターン`) | 5章 |
| `moraJudge.ts` | 1拍の受理判定に使う**純粋な部分手順**(候補集合をキー入力で絞り込む、入力済み文字列が候補と完全一致するか判定する)を提供する**無状態のヘルパー関数群**。それ自体はキー入力のループを回さない | 6.1(部分手順のみ) |
| `sequenceJudge.ts` | `romaji-automaton.md` 6.0(拍列全体のループ)と6.1(1拍を確定させるループ)の**両方を実装するエントリポイント**。拍をまたぐ状態(押し戻しの持ち越しキー・促音の絞り込み結果・直前に確定した拍・累計拍インデックス)に加え、**1拍判定中の状態(候補集合・入力済み文字列・保留中の確定候補)もここに保持する**。`moraJudge`の部分手順を呼び出しながら状態を1キーずつ進め、`KeystrokeResult`を返す | 6.0・6.1(状態保持含む全体) |

**状態保持の分担(2026-08-29、ゲート③ doc-reviewer A5/test-reviewer A1対応で確定。2026-08-29検証レビューREV-013 A4で`moraJudge`の役割を訂正):** 状態は全て`sequenceJudge`に一元化する(採用理由はテストのしやすさ。`romaji-automaton.md` 8章 判断#10)。`romaji-automaton.md` 6.1の疑似コード自体が`sequenceJudge`の内部ロジックであり、「次のキー入力を待つ」は概念上の表現で、実装ではキー入力イベントのたびに1回だけ処理が呼ばれる(状態はインスタンスフィールドとして保持する)。`moraJudge`はこの疑似コードが使う純粋な部分手順だけを切り出したもので、状態は持たない。

**`Sentence.moraList`から`MoraSequence`への変換(2026-09-06、CL-018対応):** `api-spec.yaml` `Sentence.moraList`は拍ごとに区切られた**かな文字列の配列**(`charType`を持たない)。`judgment-engine`内部の`Mora`(`types.ts`)は判定の分岐に`charType`を必要とするため、`sequenceJudge.startSentence`が`moraList`(`string[]`)を受け取り、`types.ts`の`classifyCharType`(かな1文字/2文字を見るだけの無状態な純粋関数。ん→撥音ん、っ→促音っ、ー→長音、2文字→拗音、それ以外→清音)で`MoraSequence`に変換してから判定を始める。`TypingView`は`moraList`をそのまま渡すだけでよく、`sequenceJudge`が唯一の外部公開インターフェースである原則(下記)を保つ。これは`romaji-automaton.md` 3章・CL-012が対象外とした「拍への分解」(読み文字列をモーラ境界で区切る処理)とは別物で、既に1拍ずつに区切られた文字列を`charType`に分類するだけの機械的な変換である。

**お題文をまたぐ呼び出し:** `拍列を判定する`(6.0)は1つのお題文(1つの`MoraSequence`)につき1回、`TypingView`から呼ばれる。`直前に確定した拍`・`累計拍インデックス`(下記)は`sequenceJudge`インスタンス自体が保持しセッション全体で引き継ぐため、次のお題文の呼び出しをまたいでもリセットしない。`次拍への絞り込み候補`・`持ち越しキー`はお題文の切れ目でリセットしてよい(文末の拍は既存ルールにより持ち越しキーを生まないため)。

**`KeystrokeResult`のフィールド定義(2026-08-29検証レビューREV-013 A1/A3対応で`confirmedMora`/`miss`/`moraIndex`を追加):**

| フィールド | 内容 |
|---|---|
| `confirmedText` | 確定済みの拍までの表記(採用パターンの連結) |
| `pendingInput` | 現在判定中の拍について、これまでに入力された文字列 |
| `nextHint` | 次に打つべき文字のヒント(動的選択方式。`romaji-automaton.md` 6.1末尾で確定) |
| `missAt` | 直近のミス位置(拍。ミスが無ければnull。次の正解キー入力でクリア) |
| `currentKana` | 現在判定中の拍のかな表記 |
| `moraIndex` | セッション開始からの累計拍インデックス(0始まり、お題文をまたいでも増え続ける)。**この値が直前の`KeystrokeResult`から変化したら、新しい拍の判定が始まったことを表す**(同じかなが連続する場合でも区別できる)。`sessionStore`はこの変化を検知して`kanaOccurrenceNo`を採番する(`romaji-automaton.md` 7.1) |
| `confirmedMora` | このキー入力で拍が確定した場合、その内容(`かな`・`文字種`・`採用パターン`・`moraIndex`)。確定しなければ`null` |
| `miss` | このキー入力でミスが発生した場合、その内容(`kana`・`expectedKey`(カンマ区切り整形済み)・`actualKey`・`prevKana`・`charType`)。ミスでなければ`null` |

`sessionStore`は`confirmedMora`から`correctKeyCount`・`kanaCounts`を、`miss`から`missRecords[]`(`kanaOccurrenceNo`は現在保持している採番値を付与)を組み立てる(`romaji-automaton.md` 7.1)。

`sequenceJudge.ts` が唯一の外部公開インターフェースとなり、`TypingView.vue`(S-03)はこれ以外の内部モジュールを直接呼ばない。

**`startSentence`の戻り値(2026-09-10、CL-022対応):** `startSentence`は`void`ではなく、最初の拍(お題文の1文字目)の初期状態を表す`KeystrokeResult`を返す(`confirmedText: ''`・`pendingInput: ''`・`nextHint`は最初の拍の受理パターンから選んだヒント・`missAt: null`・`currentKana`は最初の拍のかな・`confirmedMora: null`・`miss: null`)。1打鍵もしていない時点(お題文表示直後)でも`TypingView`が「次に打つべき文字」を表示できるようにするための戻り値であり、**`sessionStore.recordKeystroke`には渡さない**(実際のキー入力によるものではないため、集計対象にしない)。以降の`handleKeystroke`の呼び出し結果のみを`recordKeystroke`に渡す。

### 2.3 `api/` と `types/`

| モジュール | 責務 |
|---|---|
| `client.ts` | fetchラッパー。baseURL・共通ヘッダー・`ErrorResponse`のパースを一元化。**baseURLは`/api`固定(相対パス)とし、環境変数で切り替えない**(環境差の吸収は本番=Renderの Rewrite、local=Viteのproxyが担う。`deployment.md` 3章)。タイムアウトは**90秒**(Renderのコールドスタート復帰時間、約1分を考慮。`nonfunctional-design.md` NFR-03) |
| `userApi.ts` | `POST /api/users` | 
| `topicSetApi.ts` | `GET /api/topic-sets`, `GET /api/topic-sets/{id}/sentences` |
| `sessionApi.ts` | `POST /api/sessions`, `GET /api/users/{id}/sessions`, `GET /api/users/{id}/best` |
| `missAnalysisApi.ts` | `GET /api/users/{id}/miss-analysis` |
| `types/api.ts` | `api-spec.yaml` の `components.schemas` に対応するTS型(User, TopicSet, Sentence, SessionSubmission, SessionResult, SessionSummary, PersonalBest, MissAnalysis, ErrorResponse 等)。バックエンドDTOと同様、命名は1:1対応とする |

404応答時(userId失効)の localStorage クリア+S-01強制遷移(`screen-design.md` 2章)の具体的な処理順序は、呼び出しフローの整合が必要なため P3-07 `sequence.md` で確定する。

### 2.4 `stores/`(Pinia)

| ストア | 保持する状態 | 責務 | 対応FR |
|---|---|---|---|
| `userStore` | `userId`, `name` | localStorageとの同期(起動時読み出し・保存・クリア) | FR-12 |
| `topicStore` | 選択中 `topicSetId`、お題セット一覧、お題文一覧 | セッション開始時に1回取得し保持(ADR-002 データフロー1) | FR-01, FR-13 |
| `sessionStore` | 進行中セッションの一時ログ(`correctKeyCount`, `missRecords[]`, `keystrokeIntervalsMs[]`, かな出現回数)、かなごとの出現連番カウンタ、直近の `SessionSubmission`(送信失敗時の再送用)、直近の `SessionResult` | `judgment-engine`が返す`KeystrokeResult`を受け取り、`romaji-automaton.md` 7.1の生成規則に従って`correctKeyCount`・`keystrokeIntervalsMs`・`kanaOccurrenceNo`・`kanaCounts`を集計する。**終了条件(FR-05)の判定もここが担う**: `endConditionType=sentence_count`なら確定した文の数、`time_limit`なら`durationSeconds`の計測が`endConditionValue`に達したかを監視する。終了条件達成時に`SessionSubmission`を組み立てて`sessionApi`へ送信し、失敗時は一時ログを破棄せず保持したまま結果画面に留まる(下記「送信失敗時の再送」参照) | FR-04〜09 |

**2026-08-29改訂(ゲート③ doc-reviewer A4/test-reviewer A2・A3対応):** 当初「ロジックを持たず記録のみを行う」としていたが、かな出現連番の採番・終了条件判定は集計ロジックそのものであり実態と矛盾していた。`sessionStore`は判定ロジック(1拍が合っているか)は持たない(それは`judgment-engine`の責務)が、セッション全体の集計・終了判定は持つ、と改める。

**FR-05 終了条件判定の計測定義:**

| 項目 | 定義 |
|---|---|
| `durationSeconds`の計測開始 | 最初のキー入力(keydown)イベント |
| `durationSeconds`の計測終了 | 終了条件達成時点(最後の拍が確定した瞬間、または制限時間到達を検知した瞬間) |
| 制限時間モードで打鍵途中の拍 | 破棄する。`correctKeyCount`・`kanaCounts`・ミス記録のいずれにも計上しない |

**送信失敗時の再送(2026-08-29、ops-reviewer A1対応で確定):** `POST /api/sessions`が失敗(タイムアウト・500等)した場合、`sessionStore`の一時ログは**破棄せず**保持したまま`ResultView`にエラー表示+「もう一度送信」ボタンを出す(`sequence.md` 5.1)。同じ`SessionSubmission`を再送し、201が返って初めて一時ログを破棄する。送信中は二重送信防止のためボタンを無効化する。

### 2.5 `views/`(画面、`screen-design.md` 1章と1:1対応)

| コンポーネント | 画面ID |
|---|---|
| `NameInputView.vue` | S-01 |
| `HomeView.vue` | S-02 |
| `TypingView.vue` | S-03 |
| `ResultView.vue` | S-04 |
| `HistoryView.vue` | S-05 |
| `MissAnalysisView.vue` | S-06 |

### 2.6 `components/`(画面内の再利用パーツ、代表的なもののみ列挙)

| コンポーネント | 責務 | 使用画面 |
|---|---|---|
| `TypingDisplay.vue` | `KeystrokeResult` を確定済み文字・次に打つ文字・ミス位置の表示に変換 | S-03 |
| `SessionMetricsSummary.vue` | Net/Raw KPM・正確率・Consistency・自己ベスト比較の表示 | S-04, S-05 |
| `MissAnalysisSection.vue` | ミス分析4観点(かな別/誤りパターン別/直前かな別/文字種別)を1セクションとして表示 | S-06 |

上記以外の小さな部品(ボタン等)はP5実装時に必要に応じて追加する(MVP規模のためここでは列挙しない)。

### 2.7 `router/`

`index.ts` に S-01〜S-06 のルートを定義する。画面遷移(`screen-design.md` 2章の遷移図)どおりのパス設計とし、遷移ガード(userId未設定時にS-01へ強制)の実装は `sequence.md` で確定する。

### 2.8 FR-ID トレーサビリティ

| FR-ID | judgment-engine | stores | views/components |
|---|---|---|---|
| FR-01 | — | `topicStore` | `HomeView`/`TypingView` |
| FR-02 | `moraJudge.ts`/`specialMora.ts`/`moraPatterns.ts` | `sessionStore` | `TypingView`/`TypingDisplay` |
| FR-03 | `sequenceJudge.ts`/`types.ts`(`KeystrokeResult`) | — | `TypingDisplay` |
| FR-04 | `moraJudge.ts` | `sessionStore` | `TypingView` |
| FR-05 | — | `sessionStore` | `HomeView`/`TypingView` |
| FR-06〜09 | — | `sessionStore` | `ResultView`/`SessionMetricsSummary`/`HistoryView` |
| FR-10, FR-11 | — | — | `MissAnalysisView`/`MissAnalysisSection` |
| FR-12 | — | `userStore` | `NameInputView`/`HomeView` |
| FR-13 | — | `topicStore` | `HomeView` |

### 2.9 未決事項

~~404時のlocalStorageクリア+S-01強制遷移、および結果保存失敗時のエラー画面遷移の具体的な呼び出し順序は P3-07 `sequence.md` で確定する~~ → 解決済み。`sequence.md` 5.1・5.2、および起動時ルーターガード(`sequence.md` 5.3)で確定(2026-08-29)
