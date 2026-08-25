---
doc_id: BD-005
status: fixed
updated: 2026-08-26
---

# テーブル定義

ER図は [er-diagram.md](./er-diagram.md) を参照。各テーブルに TBL-ID を振る。

## FR-ID × テーブル対応表

| FR-ID | 対応テーブル | 備考 |
|---|---|---|
| FR-01 | TBL-03 | |
| FR-02 | (なし) | フロントエンド完結、DB非経由(ADR-002) |
| FR-03 | (なし) | フロントエンド完結、DB非経由(ADR-002) |
| FR-04 | TBL-05 | |
| FR-05 | TBL-04 | 終了条件の種類・値のみ保存。判定自体はフロントエンドで行う |
| FR-06 | TBL-04 | |
| FR-07 | TBL-04 | |
| FR-08 | TBL-04 | |
| FR-09 | TBL-04 | |
| FR-10 | TBL-05, TBL-06 | |
| FR-11 | (なし) | ミス分析APIが都度生成。永続化しない |
| FR-12 | TBL-01 | |
| FR-13 | TBL-02, TBL-03 | |

## TBL-01 users(利用者)

対応FR: FR-12

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(100) | NOT NULL, UNIQUE | 利用者名。同名なら同一人物として扱う(FR-12) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | |

## TBL-02 topic_sets(お題セット/難易度)

対応FR: FR-13

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| name | VARCHAR(50) | NOT NULL | 難易度名(例: 初級) |
| description | TEXT | NULL可 | |
| sort_order | INT | NOT NULL | 選択画面での表示順 |

## TBL-03 sentences(お題文)

対応FR: FR-01, FR-13

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| topic_set_id | BIGINT | NOT NULL, FK→topic_sets(id) | |
| text | VARCHAR(200) | NOT NULL | 日本語表記(かな漢字混じり)。FR-01 の表示に使う |
| reading | VARCHAR(200) | NOT NULL | かな読み。FR-02 の判定対象の元データ |

シードデータとして開発者が投入する(charter.md 3.2「お題投稿」はスコープ外)。

## TBL-04 sessions(セッション結果)

対応FR: FR-05, FR-06, FR-07, FR-08, FR-09

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | NOT NULL, FK→users(id) | |
| topic_set_id | BIGINT | NOT NULL, FK→topic_sets(id) | 自己ベスト(FR-09)の難易度別集計に使う |
| net_kpm | NUMERIC(6,2) | NOT NULL | |
| raw_kpm | NUMERIC(6,2) | NOT NULL | |
| accuracy | NUMERIC(5,2) | NOT NULL | 正確率(%) |
| consistency | NUMERIC(8,2) | NOT NULL | 打鍵間隔のばらつき |
| duration_seconds | INT | NOT NULL | 所要時間 |
| end_condition_type | VARCHAR(20) | NOT NULL, CHECK IN ('sentence_count','time_limit') | S-02で選択した終了条件の種類(FR-05)。同じ難易度でも条件別に履歴を区別するために使う |
| end_condition_value | INT | NOT NULL | 終了条件の値(お題N文のNまたは制限時間の秒数) |
| played_at | TIMESTAMP | NOT NULL, DEFAULT now() | FR-08 の一覧ソートに使う |

フロントエンドは正誤ログ(`correctKeyCount` / `durationSeconds` / `keystrokeIntervalsMs` / ミス記録 / かな出現回数)を送信し、バックエンドの typing-core が `net_kpm`・`raw_kpm`・`accuracy`・`consistency` を算出して本テーブルに保存する(ADR-002)。打鍵の生ログ・正しく確定したキー入力数自体は永続化しない(詳細は [`api-spec.yaml`](./api-spec.yaml) を参照)。

セッション終了条件を満たさず中断した場合は行を作らない(FR-05)。DB障害時はトランザクション単位で成功/失敗を確定し、部分保存はしない(NFR-09)。

## TBL-05 miss_records(ミス記録・キー単位のイベント)

対応FR: FR-04, FR-10

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | NOT NULL, FK→sessions(id) | |
| kana_occurrence_no | INT | NOT NULL | 同一セッション内で、`kana` 列と同じかなが何回目に出現したかの連番(かなの種類ごとに1から数え直す)。`(session_id, kana, kana_occurrence_no)` の組で「同じ拍への複数ミス」をグルーピングするキーになる(er-diagram.md 3.1) |
| kana | VARCHAR(4) | NOT NULL | ミスが起きたかな1拍(例: し) |
| expected_key | VARCHAR(10) | NOT NULL | 期待していたキー。FR-02 の複数受理表記(し→si/shi/ci等)がある場合にどの表記由来のキーを記録するかは未決事項(下記参照) |
| actual_key | VARCHAR(10) | NOT NULL | 実際に入力されたキー |
| prev_kana | VARCHAR(4) | NULL可 | 直前に確定していたかな1拍。セッション最初の拍はNULL |
| char_type | VARCHAR(10) | NOT NULL, CHECK IN ('清音','拗音','撥音ん','促音っ','長音') | |

1回の誤入力 = 1行。同じ拍で3回ミスすれば3行入る(受け入れ条件どおり全件記録し、分析時に拍単位へ集約する)。

## TBL-06 session_kana_counts(セッション内のかな1拍別総出現回数)

対応FR: FR-10

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | NOT NULL, FK→sessions(id) | |
| kana | VARCHAR(4) | NOT NULL | |
| char_type | VARCHAR(10) | NOT NULL | |
| total_count | INT | NOT NULL | そのセッションで、そのかなが出現した総回数(ミスの有無を問わない) |

UNIQUE制約: `(session_id, kana)`。フロントエンドがセッション終了時に集計して送る(er-diagram.md 3.2)。

## 未決事項

- 具体的なインデックス設計(検索頻度の高いカラムへの追加インデックス)は P3 `db-access.md` で確定する
- Flyway のマイグレーションファイル分割は P5 実装時に決める
- TBL-04 `consistency NUMERIC(8,2)` の桁数は暫定。統計量の定義(標準偏差[ms]か変動係数か)が P3 `logic-spec/romaji-automaton.md` 相当の詳細設計で確定した時点で再確認する
- TBL-05 `expected_key` の記録規則(複数受理表記があるときにどの表記由来のキーを記録するか)は、P3 `logic-spec/romaji-automaton.md` の受理表確定と合わせて定める。桁数 `VARCHAR(10)` の妥当性もその際に再確認する(2026-08-26, REV-007 A1)
