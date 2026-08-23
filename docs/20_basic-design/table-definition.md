---
doc_id: BD-005
status: draft
updated: 2026-08-23
---

# テーブル定義

ER図は [er-diagram.md](./er-diagram.md) を参照。各テーブルに TBL-ID を振る。

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

対応FR: FR-06, FR-07, FR-08, FR-09

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
| played_at | TIMESTAMP | NOT NULL, DEFAULT now() | FR-08 の一覧ソートに使う |

正確率算出に必要な「正しく確定したキー入力数」自体は保存しない。フロントエンドが算出した `net_kpm`・`raw_kpm`・`accuracy` の最終値をバックエンドがそのまま受け取り保存する(打鍵の生ログはリクエスト時の計算にのみ使い、永続化しない。詳細は P2-04 `api-spec.yaml` で確定)。

セッション終了条件を満たさず中断した場合は行を作らない(FR-05)。DB障害時はトランザクション単位で成功/失敗を確定し、部分保存はしない(NFR-09)。

## TBL-05 miss_records(ミス記録・キー単位のイベント)

対応FR: FR-04, FR-10

| カラム | 型 | 制約 | 内容 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | NOT NULL, FK→sessions(id) | |
| kana_occurrence_no | INT | NOT NULL | セッション内でそのかなが何拍目の出現かの通し番号。同じ拍への複数ミスをグルーピングするキー(er-diagram.md 3.1) |
| kana | VARCHAR(4) | NOT NULL | ミスが起きたかな1拍(例: し) |
| expected_key | VARCHAR(10) | NOT NULL | 期待していたキー |
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
