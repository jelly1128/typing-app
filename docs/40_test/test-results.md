---
doc_id: TST-006
status: draft
updated: 2026-09-12
---

# テスト結果

P6(テスト実施)の実行記録。UT/ITは`mvn test`/`npm run test`(Vitest)で自動実行し、結果をここに追記していく。STはP6-03〜05でPlaywrightテストを実装した後にここへ追記する。

## P6-02: UT/IT全件再実行(2026-09-12)

**実行環境:** Docker(PostgreSQL 16、`docker compose up -d`起動済み)+ ローカル(`mvn test` / `npm run test`)

### バックエンド(`mvn test`)

| モジュール | 対象 | テスト数 | 結果 |
|---|---|---|---|
| `typing-core` | `AdviceGeneratorTest`(7) / `SessionMetricsCalculatorTest`(6) | 13 | 全件Green |
| `api` | `MissAnalysisControllerTest`(2) / `SessionControllerTest`(3) / `TopicSetControllerTest`(4) / `UserControllerTest`(1) / `GlobalExceptionHandlerTest`(7) / `RepositorySmokeTest`(5) / `MissAnalysisServiceTest`(3) / `SessionServiceTest`(13) / `TopicSetServiceTest`(3) / `UserServiceTest`(6) | 47 | 全件Green |
| **合計** | | **60** | **BUILD SUCCESS** |

`RepositorySmokeTest`はFlywayマイグレーション(6件)の整合性検証も兼ねる(`ddl-auto=validate`)。UT(2.1)はService層(Mockito、Repositoryモック化)、IT(2.2)はRepository/Controller層(実DB・`@WebMvcTest`)が該当。

### フロントエンド(`npm run test` = Vitest)

| 項目 | 件数 | 結果 |
|---|---|---|
| テストファイル | 15 | 全件Pass |
| テストケース | 97 | 全件Pass |

内訳: `judgment-engine`(UT、`moraJudge`/`sequenceJudge`)、`stores`(`userStore`/`topicStore`/`sessionStore`)、`views`(S-01〜S-06各コンポーネント)、`router`。

### 総括

バックエンド60件 + フロントエンド97件 = **157件、全件Green**。`ut-cases.md`(65件)/`it-cases.md`(17件)のケース定義に対する実装漏れは今回の再実行では検出されなかった(P4-06のトレーサビリティマトリクスで全FR-ID充足済み)。

## ST(P6-03〜05で実装後に追記)

未着手。
