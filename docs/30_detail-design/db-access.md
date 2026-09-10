---
doc_id: DD-004
status: fixed
updated: 2026-08-29
---

# DBアクセス設計

対応: `table-definition.md`(TBL-01〜06)、`er-diagram.md`、`class-design.md` 1.4節のRepository/Entity一覧。

---

## 1. JPAエンティティマッピングの方針

- **単方向 `@ManyToOne` のみ**を子→親に張る(`Session→User`、`Session→TopicSet`、`Sentence→TopicSet`、`MissRecord→Session`、`SessionKanaCount→Session`)。親側に `@OneToMany` のコレクションは持たせない。理由: 親から子を辿る操作は現状のFRに存在せず(例えば「あるユーザーの全セッション」は常にRepositoryへの直接クエリで取得する)、双方向関連はN+1・遅延読み込みの管理コストの割に使い道がない
- **enumはJava enumの定数名をDBのCHECK制約・API仕様のenum値と同じ文字列にする**(例: `CharType.清音`)。Java識別子はUnicode文字を許容するため構文上問題ない。DB↔Java↔JSONの3層で変換テーブルを持たずに済む
  - `EndConditionType { sentence_count, time_limit }` → `@Enumerated(EnumType.STRING)`
  - `CharType { 清音, 拗音, 撥音ん, 促音っ, 長音 }` → 同上

## 2. Entity一覧

| Entity | 対応TBL | 主なフィールド | 関連 |
|---|---|---|---|
| `User` | TBL-01 | `id`, `name`(UNIQUE), `createdAt` | — |
| `TopicSet` | TBL-02 | `id`, `name`, `description`(nullable), `sortOrder` | — |
| `Sentence` | TBL-03 | `id`, `text`, `moraList`(`List<String>`。`@Type`または`@JdbcTypeCode(SqlTypes.JSON)`でJSONBにマッピング) | `topicSet: TopicSet`(`@ManyToOne`) |
| `Session` | TBL-04 | `id`, `netKpm`, `rawKpm`, `accuracy`, `consistency`, `durationSeconds`, `endConditionType`(enum), `endConditionValue`, `playedAt` | `user: User`, `topicSet: TopicSet`(いずれも`@ManyToOne`) |
| `MissRecord` | TBL-05 | `id`, `kanaOccurrenceNo`, `kana`, `expectedKey`, `actualKey`, `prevKana`(nullable), `charType`(enum) | `session: Session`(`@ManyToOne`) |
| `SessionKanaCount` | TBL-06 | `id`, `kana`, `charType`(enum), `totalCount` | `session: Session`(`@ManyToOne`)。`@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "kana"}))` |

## 3. 未決事項の解決: TBL-05 `expected_key` の記録規則

`romaji-automaton.md` 7章・`table-definition.md` 未決事項からの申し送り事項。

**結論: 複数候補がある場合は、候補の1文字ずつをカンマ区切りでアルファベット順に連結した文字列として保存する**(例: 「し」の1文字目でミスした場合、候補は `{s, c}` → `"c,s"` と保存)。

**根拠:**
- `romaji-automaton.md` 6.1節の `期待キー候補 = { p[入力済み文字列の長さ] | p ∈ 候補集合 }` は、候補パターンの「ミスした位置の1文字」の集合であり、常に**単一文字の集合**になる(ローマ字は1キー=1文字ずつ比較するため)。実在するかな受理表(4章)で最大でも3〜4文字程度(例: じゃ→z/j)。カンマ区切りにしても `VARCHAR(10)` に収まる
- 配列型カラムは追加しない。既存の `VARCHAR(10)` のまま収まり、Flywayマイグレーションの追加が不要
- 代表1件に絞る案(却下): どの表記に寄せてミスしたかという情報が失われ、FR-10(2)「誤りパターン別発生回数」の分析精度が下がる。カンマ区切りで全候補を残せば、分析側(P5実装)で必要なら先頭要素だけを見ることもできる
- 順序をアルファベット順に固定するのは、同じミスが起きた際に保存文字列が常に同じになることを保証するため(テスト容易性)

`table-definition.md` の桁数 `VARCHAR(10)` は上記の想定で妥当と確認した(変更不要)。

## 4. Repositoryクエリ設計

### 4.1 単純CRUD・導出クエリ

| Repository | メソッド | 用途 |
|---|---|---|
| `UserRepository` | `findByName(name)` | find-or-create(FR-12) |
| `UserRepository` | `existsById(userId)` | userId存在確認(404判定。class-design.md 1.4) |
| `TopicSetRepository` | `findAllByOrderBySortOrder()` | お題セット一覧(FR-13) |
| `TopicSetRepository` | `existsById(topicSetId)` | topicSetId存在確認(404判定) |
| `SentenceRepository` | `findByTopicSetIdOrderById(topicSetId)` | お題文一覧(FR-01)。第2ソートキー`id`でタイブレークし順序を確定させる(2026-08-29、ops-reviewer B7対応) |
| `SessionRepository` | `findSummariesByUserIdOrderByPlayedAtDesc(userId)` | 履歴一覧(FR-08)。`topicSetName`表示のため`topicSet`をJOINするプロジェクションクエリ(2026-09-07 P5-09実装時にN+1回避のため`SessionSummaryProjection`を返す形に変更。CL-025で本行を実装に追従させた) |

### 4.2 自己ベスト(FR-09)

`SessionRepository` に集計クエリを1本追加する。

```
SELECT MAX(s.netKpm), MAX(s.accuracy)
FROM Session s
WHERE s.user.id = :userId AND s.topicSet.id = :topicSetId
```

`netKpmBest` と `accuracyBest` は**別々のセッションで達成された値でもよい**(`api-spec.yaml` `PersonalBest` は難易度別の最大値であり、同一セッション由来である必要はない)。そのため2つのMAXを独立に取るだけでよく、「最良セッション1件を探す」クエリにはしない。

**404判定との関係(2026-08-29、doc-reviewer A2/test-reviewer A6対応):** このMAXクエリは0件でも`null`を返すため、「セッションが0件」と「userId/topicSetIdが不存在」を区別できない。`SessionService`は本クエリの前に`UserRepository.existsById`/`TopicSetRepository.existsById`で存在確認を行い、不存在なら404、存在するが0件ならMAXの`null`をそのまま`PersonalBest`(`netKpmBest`/`accuracyBest`ともnull)として200で返す。

### 4.3 ミス分析(FR-10)

**設計判断: 「拍単位ミス集合」を1本のクエリで取得し、Service層(`MissAnalysisService`)でカテゴリごとに再集計する。**

`er-diagram.md` 3.1のとおり、同じ拍への複数回ミスは `miss_records` に複数行入るため、そのまま `GROUP BY kana, COUNT(*)` すると「拍単位のミス回数」ではなく「キー入力単位のミス回数」になり過大計上する。PostgreSQLのタプルDISTINCTを使い、`(session_id, kana, kana_occurrence_no)` の組で重複除去した「拍単位ミス」のリストを1回のネイティブクエリで取得する:

```sql
SELECT DISTINCT ON (mr.session_id, mr.kana, mr.kana_occurrence_no)
    mr.kana, mr.prev_kana, mr.char_type
FROM miss_records mr
JOIN sessions s ON s.id = mr.session_id
WHERE s.user_id = :userId
ORDER BY mr.session_id, mr.kana, mr.kana_occurrence_no, mr.id
```

`ORDER BY`末尾に`mr.id`を追加し、`DISTINCT ON`が返す行を一意に確定させる(2026-08-29、doc-reviewer C3/ops-reviewer C1対応)。

このリストを `MissAnalysisService` が `kana` / `prevKana` / `charType` それぞれでグルーピングしてカウントすれば、FR-10(1)(3)(4)の分子(拍単位ミス数)が揃う。

**出力順序・件数・NULL扱い(2026-08-29、test-reviewer A8対応で確定):**

- **件数上限は設けない(全件返す)**。理由: 集計後の行数は「かな/文字種/誤りパターンの種類数」で頭打ちになり、セッション数の増加に比例しないため(種類数自体は拍の種類・キーの組み合わせで有限)
- 並び順のタイブレーク: `byKana`は`missCount`降順→同数なら`missRate`降順→さらに同値なら`kana`昇順。`byErrorPattern`は`count`降順→同値なら`expectedKey`昇順→`actualKey`昇順。`byPrevKana`は`missRate`降順→同値なら`prevKana`昇順。`byCharType`は文字種の定義順(清音/拗音/撥音ん/促音っ/長音)で固定(「多い順」の指定が無いため)
- `prev_kana IS NULL`(セッション最初の拍)の行は`byPrevKana`の集計から**除外する**(決定④によりセッション全体で最初の1件のみ発生するため、除外しても分析精度への影響は無視できる。含めると分母が存在せず0除算になる)

**FR-10(2)「誤りパターン別発生回数」だけは拍単位ではなく生イベント単位**であることに注意(`api-spec.yaml` `byErrorPattern` の `count` に「拍単位」の記載がない)。こちらは重複除去せず、別クエリで素直に集計する:

```
SELECT mr.expectedKey, mr.actualKey, COUNT(mr)
FROM MissRecord mr JOIN mr.session s
WHERE s.user.id = :userId
GROUP BY mr.expectedKey, mr.actualKey
```

分母側は `SessionKanaCountRepository` に集計クエリを追加する:

```
SELECT skc.kana, SUM(skc.totalCount)
FROM SessionKanaCount skc JOIN skc.session s
WHERE s.user.id = :userId
GROUP BY skc.kana
```

```
SELECT skc.charType, SUM(skc.totalCount)
FROM SessionKanaCount skc JOIN skc.session s
WHERE s.user.id = :userId
GROUP BY skc.charType
```

`byKana`/`byPrevKana`/`byCharType`のミス数(分子)と出現回数(分母)を`MissAnalysisService`側でキー(kana/charType)ごとに突き合わせ、率を計算する(1.4節どおりServiceの責務)。**`byKana`の出現回数(分母)はクエリ・突き合わせの時点で既に得られている値であり、率の計算に使うだけでなく`KanaMissStat.occurrenceCount`としてそのまま出力にも含める**(2026-08-30 CL-016。`AdviceGenerator`側の逆算推定をやめ実測値を使うため)。

## 5. トランザクション境界(NFR-09)

`SessionService.submitSession` を `@Transactional` にし、`sessions` 1行 + `miss_records` N行 + `session_kana_counts` M行の挿入を1トランザクションにまとめる。いずれかの挿入が失敗(制約違反等)した場合は全体をロールバックし、`GlobalExceptionHandler` が500応答に変換する(部分保存をしない、`nonfunctional-design.md` NFR-09どおり)。

他のエンドポイント(GET系、`POST /api/users`のfind-or-create)は単一の読み書きのみのため、明示的な`@Transactional`は付けず、Spring Data JPAのデフォルト(メソッド単位の暗黙トランザクション)に委ねる。

## 6. インデックス設計(`table-definition.md`未決事項への回答)

| インデックス | 対象 | 用途 |
|---|---|---|
| `idx_sessions_user_played` | `sessions(user_id, played_at DESC)` | FR-08 履歴一覧のソート |
| `idx_sessions_user_topicset` | `sessions(user_id, topic_set_id)` | FR-09 自己ベスト集計 |
| `idx_miss_records_session` | `miss_records(session_id)` | FR-10 の `sessions` への JOIN |
| `idx_sentences_topicset` | `sentences(topic_set_id)` | FR-01 お題文取得 |

`session_kana_counts` は既存のUNIQUE制約 `(session_id, kana)` が `session_id` 先頭のインデックスを兼ねるため追加不要。`users.name` も既存のUNIQUE制約で足りる。具体的なFlywayマイグレーションファイルへの反映はP5実装時に行う。

## 7. シードデータの管理方針(2026-08-29、ゲート③ ops-reviewer A2対応で確定)

`nonfunctional-design.md` NFR-08は、Render無料枠のPostgresが失効した場合の復旧策として「DBを作り直す」ことを受入リスクとして採用している(方針(c))。この復旧策を実際に機能させるには、`topic_sets`/`sentences`(お題マスタ)が**DB再作成時に自動的に復元される**必要がある。

**結論: お題マスタ(TBL-02/TBL-03)のシードデータはFlywayの`R__`(繰り返し可能マイグレーション)として管理し、リポジトリにコミットする。** 手動INSERTでは投入しない。DBを作り直してFlywayを実行すれば、アプリケーションスキーマと同時にお題マスタも復元される。具体的なマイグレーションファイルの分割・内容(難易度3件、各セット5文以上、拗音・促音・撥音・長音を各1回以上含む)はP5実装時に決める。

`sessions`/`miss_records`/`session_kana_counts`(利用者の記録)はこの対象外で、DB再作成時に失われることを引き続き受け入れる(NFR-08)。

## 8. 未決事項

なし(本タスクでTBL-05 `expected_key`・インデックス設計・シードデータ管理方針の未決事項をいずれも解決した)。
