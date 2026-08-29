---
doc_id: DD-001
status: draft
updated: 2026-08-29
---

# クラス設計

実装者(Claude)がこの文書だけを見てクラス構成に迷わず書き始められることを目的とする。メソッドの中身(業務ロジックの手順)は書かない。手順は `logic-spec/` の各仕様、または P3-07 `sequence.md` に譲る。

- 1章: バックエンド(P3-04)
- 2章: フロントエンド(P3-05、未着手)

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
| `KanaMissStat` | record | `kana`, `missCount`, `missRate` | FR-11 | 同上 |
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
| `TopicSetService` | お題セット一覧・お題文一覧の取得 | FR-01, FR-13 |
| `SessionService` | リクエストの値域チェック → `SessionMetricsCalculator` 呼び出し → `@Transactional` で結果・ミス記録・かな出現回数を保存 → 自己ベスト比較(`isNetKpmBest`/`isAccuracyBest`) | FR-04〜09 |
| `MissAnalysisService` | Repositoryから全期間のミス記録・かな出現回数を取得し4観点に集計 → `AdviceGenerator` 呼び出し | FR-10, FR-11 |

集計クエリの具体的な実装方針(JPQL/ネイティブクエリ、インデックス)は P3-06 `db-access.md` で確定する。

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
| `GlobalExceptionHandler`(`@RestControllerAdvice`) | 例外→`ErrorResponse`変換、`traceId`採番、500時のログ出力(NFR-07) |
| `UserNotFoundException` / `TopicSetNotFoundException` | 404応答に変換(userId・topicSetId不在) |
| `InvalidSessionSubmissionException` | 400応答に変換(値域外、`missRecords[].kana`がkanaCountsに一致しない等) |

### 1.5 FR-ID トレーサビリティ

| FR-ID | typing-core | api |
|---|---|---|
| FR-01 | — | `TopicSetController`/`TopicSetService`/`SentenceRepository` |
| FR-04 | — | `SessionService`/`MissRecordRepository` |
| FR-05 | — | `SessionController`/`SessionService`/`SessionRepository` |
| FR-06 | `SessionMetricsCalculator` | `SessionService` |
| FR-07 | — | `SessionService`/`SessionRepository` |
| FR-08 | — | `SessionController`/`SessionRepository` |
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
| `types.ts` | `Mora` / `MoraSequence` / `MissRecord` / `KeystrokeResult`(1キー入力ごとの判定結果。確定済み文字・次の候補・ミス有無を持つ) | 3章 |
| `moraPatterns.ts` | 4章の表(清音・拗音)をかな→受理パターンの辞書として持つ | 4章 |
| `specialMora.ts` | 撥音ん・促音っ・長音ーの受理パターン関数(`んの受理パターン` `っの受理パターン` `次の拍の受理パターンを絞り込む` `ーの受理パターン`) | 5章 |
| `moraJudge.ts` | 1拍を確定させるループ(`拍を判定する` `この拍を確定する`)。キー入力を1つずつ受け取り `KeystrokeResult` を返す | 6.1 |
| `sequenceJudge.ts` | 拍列全体のループ(`拍列を判定する`)。押し戻し(持ち越しキー)・促音の絞り込み結果を拍間で引き継ぐ状態を保持するエントリポイント | 6.0 |

`sequenceJudge.ts` が唯一の外部公開インターフェースとなり、`TypingView.vue`(S-03)はこれ以外の内部モジュールを直接呼ばない。

### 2.3 `api/` と `types/`

| モジュール | 責務 |
|---|---|
| `client.ts` | fetchラッパー。baseURL・共通ヘッダー・`ErrorResponse`のパースを一元化 |
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
| `sessionStore` | 進行中セッションの一時ログ(`correctKeyCount`, `missRecords[]`, `keystrokeIntervalsMs[]`, かな出現回数)、直近の `SessionResult` | タイピング中の一時保持(system-architecture.md データフロー2)、終了時に `SessionSubmission` を組み立てて `sessionApi` へ送信 | FR-04〜09 |

`sessionStore` が保持する一時ログは `judgment-engine` の `KeystrokeResult`/`MissRecord` を蓄積したものであり、Pinia store 自体はロジックを持たず記録のみを行う(判定ロジックとの責務分離)。

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

- 404時のlocalStorageクリア+S-01強制遷移、および結果保存失敗時のエラー画面遷移の具体的な呼び出し順序は P3-07 `sequence.md` で確定する
