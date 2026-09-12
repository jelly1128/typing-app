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

## P6-03: ST-001〜009(主要シナリオ、2026-09-12)

**実行環境:** Docker(PostgreSQL)+ `mvn spring-boot:run`(backend)+ `npm run dev`(frontend)+ Playwright(`channel: 'chrome'`)

`frontend/e2e/main-scenarios.spec.ts`に実装。ST-001〜003はブラウザ操作(名前入力→お題選択→タイピング→結果)を実際に行い、ST-004〜009は`POST /api/sessions`をAPI直接呼び出しして事前データ(履歴・自己ベスト・ミス記録)を投入した上で画面表示を確認する方式(実データ準備をUI操作で行うと9件分では遅く不安定なため。タイピング判定ロジック自体はUT/ITで検証済み)。

| ID | 概要 | 結果 |
|---|---|---|
| ST-001 | ハッピーパス一気通貫(あさ→asa、1文でノーエラー到達) | PASS |
| ST-002 | お題数モード2文完走(あさ→がっこう、促音"gakkou") | PASS |
| ST-003 | 制限時間モード完走(打鍵途中で時間到達、破棄) | PASS |
| ST-004 | 履歴一覧、新しい順(後発セッションが先頭) | PASS |
| ST-005 | 履歴0件時の空状態表示 | PASS |
| ST-006 | 自己ベスト、難易度別で混在しない | PASS |
| ST-007 | 自己ベスト0件時の空状態表示 | PASS |
| ST-008 | ミス傾向分析、4観点中2観点(かな別/誤りパターン別)の多い順を確認 | PASS |
| ST-009 | 改善アドバイス(誤りパターン閾値3回以上)表示 | PASS |

**9件、全件PASS。** 実装中に1件、ST-001で`/typing`遷移直後(TypingViewの`onMounted`完了前)にキー入力を送ってしまい打鍵が失われ`/result`へ遷移しないバグ(テストコード側の不具合)を発見・修正した。アプリケーション本体の不具合は0件。

## P6-04: ST-010〜013(異常系・遷移制御、2026-09-12)

着手時、`sequence.md`5.2(userId失効時にuserStoreをクリアしS-01へ強制遷移する共通処理)が「物理的な実装配置はP5で決める」という未決事項のまま、実装されていないことが判明した。Kazukiと相談し、`frontend/src/api/errorHandling.ts`(`handleUserNotFound`)を実装してから`HistoryView`/`MissAnalysisView`のcatchブロックに組み込み、テストを書いた(CL-028)。

`frontend/e2e/error-and-navigation.spec.ts`に実装。ST-013は実タイピングだと`durationSeconds`が丸めで0になり`netKpm=0`扱いになる(session-metrics.md 2.2)ため、最初のキー入力から1秒以上経過させてから打ち終える調整を入れた。

| ID | 概要 | 結果 |
|---|---|---|
| ST-010 | userId失効時、404後にlocalStorageクリア→S-01強制遷移 | PASS |
| ST-011 | 起動時ガード、userId未設定で保護ルートへ直接アクセス→S-01 | PASS |
| ST-012 | 送信失敗(500)→エラー表示→再送→成功 | PASS |
| ST-013 | 自己ベスト更新直後、isNetKpmBestで新記録が示される | PASS |

**4件、全件PASS。** 実装した機能自体(共通404ハンドラ)は今回追加したものであり、P5完了時点では未実装だった(既存の不具合ではなく、未着手のまま埋もれていた設計項目)。

## ST-014〜015(P6-05で実装後に追記)

未着手。
