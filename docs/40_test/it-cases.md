---
doc_id: TST-003
status: fixed
updated: 2026-08-30
---

# 結合テストケース(IT)

`test-plan.md` 2.2節の対象・ID体系に従う。P4-04。Kazuki確認済み(2026-08-30)。実DB(PostgreSQLコンテナ、Testcontainers等)を前提とする。

## 1. エンドポイントのエンドツーエンド(Controller→Service→Repository→DB)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| IT-001 | `POST /api/users` | 正常系(新規作成) | 未登録の名前 | 200、DBにレコードが作成される | FR-12 |
| IT-002 | `GET /api/topic-sets` | 正常系 | topic_setsに複数件のシードデータ | sort_order順の一覧 | FR-13 |
| IT-003 | `GET /api/topic-sets/{id}/sentences` | 正常系 | 存在するtopicSetId | お題文一覧 | FR-01, FR-13 |
| IT-004 | `GET /api/topic-sets/{id}/sentences` | 404(topicSetId不存在) | 存在しないID | 404、ErrorResponse | FR-01, FR-13 |
| IT-005 | `POST /api/sessions` | 正常系、保存後の参照可能性(FR-07受け入れ条件) | 有効なリクエスト | 201。直後に履歴(FR-08)・自己ベスト(FR-09)・ミス分析(FR-10)から参照できる | FR-04〜09 |
| IT-006 | `POST /api/sessions` | トランザクション境界(NFR-09) | 値域チェックに違反するリクエスト(例: kanaCounts重複) | 400。sessions/miss_records/session_kana_countsのいずれにも部分データが残らない | FR-07 |
| IT-007 | `GET /api/users/{userId}/sessions` | 正常系 | 複数セッション保存済み | played_at降順の一覧 | FR-08 |
| IT-008 | `GET /api/users/{userId}/best` | 正常系 | 複数セッション保存済み | 難易度別のKPM最大・正確率最大 | FR-09 |
| IT-009 | `GET /api/users/{userId}/miss-analysis` | 正常系 | ミス記録複数件 | 4観点の集計結果+advice | FR-10, FR-11 |

## 2. Repositoryクエリ(`db-access.md`)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| IT-010 | `SessionRepository` | MAXクエリのnull-on-zero-rows | 対象ユーザー・難易度のセッションが0件 | クエリ結果がnull(existsByIdの404とは別扱い) | FR-09 |
| IT-011 | `MissRecordRepository` | DISTINCT ONクエリの出力順序 | 同一kana・kana_occurrence_noの重複データ | `ORDER BY session_id, kana, kana_occurrence_no, id`の順で一意な行が返る | FR-10 |
| IT-012 | FR-10集計クエリ | 件数上限なし・出力順序のタイブレーク規則 | カーディナリティの異なる複数のミス記録 | `db-access.md`4.3の出力順序・NULL扱いどおり | FR-10 |
| IT-013 | `byPrevKana`集計 | `prev_kana IS NULL`の除外 | セッション最初の拍のミス記録(prevKana=null)を含む | 集計結果からその行が除外される | FR-10 |
| IT-014 | `UserService.identifyUser` | find-or-create競合 | 同一名で同時に2リクエストを送る(UNIQUE制約違反を誘発) | 片方が`DataIntegrityViolationException`をcatchし`findByName`で既存ユーザーを返す(500にならない) | FR-12 |

## 3. NFR-09(DB障害時の挙動、障害注入=Testcontainersのコンテナ停止)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| IT-015 | `GET /api/topic-sets`等 | お題取得時のDB接続断 | テスト実行中にDBコンテナを停止 | 500、`ErrorResponse`(NFR-09) | FR-01 |
| IT-016 | `POST /api/sessions` | 結果保存時のDB接続断 | 保存処理の途中でDBコンテナを停止(または接続不可状態で実行) | 500、部分データが残らない(トランザクション単位) | FR-07 |

## 4. シードデータ(`db-access.md`7章)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| IT-017 | Flyway `R__`リポータブルマイグレーション | DB再作成後もシードデータが復元される | DBコンテナを作り直す(`docker compose down -v && up`相当) | topic_sets/sentencesのシードデータが再投入され、アプリが即使える状態になる(NFR-08受入リスクの実質的な担保) | FR-01, FR-13 |

## 未決事項

- IT-015/016のTestcontainers停止タイミング(リクエスト送信前/送信中のどちらで止めるか)は、実際にテストコードを書くP5後半で確定する(Testcontainersの操作APIに依存するため設計段階では確定しない)
- Testcontainers導入自体(`pom.xml`への追加)はP5着手時に行う(2026-08-30訂正。当初P4-02で行う想定だったが、同skillの対象外と判明したため)
