# 進捗管理

## 現在地

| 項目 | 内容 |
|---|---|
| **現在の工程** | P5 実装(P4 完了、P5タスク分解済み) |
| **次にやること** | P5-15〜17(views続き: TypingView/ResultView/HistoryView・MissAnalysisView)から着手 |
| **開始日** | 2026-08-22 |
| **ゴール予定日** | 2026年12月〜2027年1月(22〜32セッション ÷ 週1.5回) |

---

## 工程チェックリスト

- [x] **P0** プロジェクト計画 — 全工程の WBS と見積もりが1枚にあり、ゴール日が決まった状態
- [x] **P1** 要件定義 — MVP 全機能に FR-ID が振られ、スコープ外が明記された状態
  - [x] ゲート① レビュー通過(重要度 A 全件クローズ)
- [x] **P2** 基本設計 — 画面・API・テーブルが相互整合し FR-ID までトレースできる状態
  - [x] ゲート② レビュー通過(doc/test/ops 3観点、重要度A計6件クローズ。ops A2のみP2.5送りとして合意)
- [x] **P2.5** アーキ検証 — 本番 URL 上で Vue → Java → PostgreSQL 経由の文字列が表示される状態
- [x] **P3** 詳細設計 — 設計書だけで実装を書き切れる粒度になっている状態
  - [x] ゲート③ レビュー通過(doc/test/ops 3観点、重要度A計15件+検証パスA7件、全件クローズ)
- [x] **P4** テスト設計 — 全 FR-ID にテストケース ID が紐づいた状態(`traceability-matrix.md`で確認済み、ゲート無し・Kazukiの確認のみで完了)
- [ ] **P5** 実装 — ローカルで MVP の全 FR が動く状態 **タスク分解済み(2026-08-30、[wbs.md](./docs/00_project/wbs.md#p5-実装確定2026-08-30分解)、19タスク)。方針転換(2026-08-30同日): 環境構築(Maven/JUnit/Jackson配線)だけで学習効果に見合わない時間がかかったため、`typing-core`/`judgment-engine`もClaudeドラフトに変更(P1〜P4と同じパターン)。合意値合計は53.5h→45.0hに改訂。**2026-09-07再改訂: P5-05(Flyway)でも同じ現象が再発したため、backend/frontend含むP5残り全タスクをClaudeドラフト・Kazukiレビュー方式に統一(層による使い分けは廃止)**
- [ ] **P6** テスト実施 — ST 全件 PASS、未解決バグ 0
- [ ] **P7** リリース — 公開 URL を他人にそのまま渡せる状態
- [ ] **P8** 振り返り — 工程別ズレ率が数値化され補正係数が1行で書かれた状態
- [ ] **P9** (任意)多言語移植 — TypeScript 版が共有テストベクタを Java 版と同じ結果で通す状態

---

## Claude Code 機能の整備状況

| 機能 | 予定工程 | 状態 |
|---|---|---|
| CLAUDE.md | P0 | [x] 作成済み |
| commands (`/ty-plan` `/ty-end` `/ty-gate`) | P0 | [x] 作成済み |
| agents (`doc-reviewer` 他) | P1 | [x] 動作確認済み(REV-002)。`test-reviewer`/`ops-reviewer`もP2-07で動作確認済み(REV-007/008)。2026-09-07、P5のコードレビューで見つかった「横展開漏れ」「組み合わせケースの再点検」の2観点を`doc-reviewer`に追加(次回起動時に効果を確認) |
| skills (`testcase-gen` 他) | P2/P4 | [ ] ドラフト作成(`.claude/skills/testcase-gen/SKILL.md`)。同一セッション内では動作確認不可、次回セッション冒頭で確認(2026-08-30) |
| settings.json permissions | P2.5 | [x] 作成済み(git/docker/mvn/npm/gh/java/node/curl許可、破壊的操作はdeny) |
| rules (`paths:` スコープ) | P3 | [x] 作成済み(`typing-core.md`/`judgment-engine.md`)。次回セッション冒頭で読み込み確認 |
| hooks (PostToolUse) | P5(固定タスクにせず、困りごとが出たら導入検討。2026-08-30変更) | [x] 作成済み(Write/Edit後に`backend`配下の`.java`ファイルへSpotless `spotless:apply`(importOrder/removeUnusedImports)を自動実行。動作確認済み) |
| hooks (PreToolUse) | P7 | [ ] |
| Obsidian 連携 | P8 | [ ] |

---

## セッションログ

| 日付 | 工程 | やったこと | 次回に持ち越し |
|---|---|---|---|
| 2026-08-22 | P0 | 計画策定、ディレクトリ骨格、CLAUDE.md / workflow.md 作成 | |
| 2026-08-23 | P0 | 成果物の整理・詳細化、P1 のタスク分解と見積もり突き合わせ、**P0 完了** | なし |
| 2026-08-23 | P1 | ユースケース/FR/NFR/用語集/スコープ外/ADR-001 作成、doc-reviewer によるゲート①正式レビュー(重要度A=0件)、**P1 完了** | B1(リスク対策表に追加指標を反映)/B2(自己ベスト・履歴0件時の挙動)をP2で対応 |
| 2026-08-23 | P2 | P2タスク分解(P2-00)、system-architecture.md/screen-design.md/api-spec.yaml/er-diagram.md/table-definition.md/nonfunctional-design.md 作成(P2-01〜P2-05)、ADR-002(リアルタイム判定はフロントエンド完結)、charter.mdに自由入力＋事後診断モードを拡張バックログ追記、doc-reviewerによる中間レビュー(REV-004、A=1/B=6件、全件クローズ)、doc-reviewerにmodel:opusを追加 | Opus動作確認とP2文書の再レビュー比較 |
| 2026-08-23 | P2 | test-reviewer/ops-reviewer作成(P2-06b)、doc-reviewer Opus版でP2文書一式を再レビュー(P2-06a、中間REV-005 A=3/B=6→修正→検証REV-006 A=0/B=7)、修正過程でADR-003(userId推測による他人データ閲覧を受入リスクとして採用)作成。**この回は`/ty-end`を忘れ未コミットのまま終了** | 次回冒頭でP2-06a/bの実績記録・作業内容の確認 |
| 2026-08-26 | P2 | 前回の未コミット分を確認・実績記録(P2-06a/b)、P2-07(ゲート②): test-reviewer初回実行(REV-007、A=3)、ops-reviewer初回実行(REV-008、A=3)。重要度A計6件のうち5件をAPI仕様/画面設計/非機能設計の修正でクローズ(4xx応答追加、isNewBest→isNetKpmBest/isAccuracyBest分割、expectedKey記録規則をP3送りとして明記、エラーボディ/ログ項目定義、userId 404時のlocalStorageクリア導線)、残り1件(Renderバックアップ有無未確認)はP2.5着手タスクとして`wbs.md`に申し送り。**ゲート②通過、P2完了** | P2.5着手時にRenderバックアップ確認を最優先で行う |
| 2026-08-29 | P2.5 | P2.5-01〜07全完了。Render無料枠の公式ドキュメントでバックアップ非対応/30日失効を確認しNFR-08を受入リスクとして確定、Docker Compose(PostgreSQL)/Spring Boot(Java25+SpringBoot4.1.1)/Vue(Vite+TS+Pinia)雛形を作成しローカル疎通確認、deployment.md(BD-007)作成(Static Site+Web Service分離、Rewriteでプロキシ)、GitHubリポジトリ作成・push、RenderがJavaネイティブランタイム非対応と判明しDockerfileへ切替、Render 3サービス(Postgres/Web Service/Static Site)を手動デプロイし本番URLで疎通確認、.claude/settings.json作成。**P2.5完了(ゲート無し)** | なし |
| 2026-08-29 | P3 | P3タスク分解(9タスク・合意値12.0h、wbs.mdに記録)。P3-01(ローマ字オートマトン仕様)/P3-02(セッション集計計算仕様)/P3-03(改善アドバイス生成仕様)完了。P3-03の作成中、Kazuki要望でアドバイスを単一選択→複数返却方式に変更し、確定済みだったapi-spec.yaml/screen-design.mdをCL-005で修正。doc-reviewerによるP3中間レビュー(REV-009)を実施し重要度A6件検出、全件クローズ(長音仕様の上流修正+ADR-004、撥音んのn/nn押し戻し欠陥修正、促音の絞り込み配線ミス修正、byCharType出現0件対応、上流未決事項の解決済み化、正確率既定値の自己ベスト汚染防止)。B6(な行でも同種の衝突が残っていた)も追加で修正。B/C残り(10件・5件)はゲート③に申し送り | P3-04(クラス設計)から着手 |
| 2026-08-29 | P3 | P3-04(クラス設計・バックエンド)/P3-05(同・フロントエンド)/P3-06(DBアクセス設計)/P3-07(シーケンス図)/P3-08(rules整備)完了。`class-design.md`/`db-access.md`/`sequence.md`を新規作成。P3-04でFR-11(改善アドバイス生成)を`typing-core`に含める判断(CL-009、system-architecture.md修正)。P3-06でTBL-05 `expected_key`記録規則(カンマ区切り・アルファベット順)とインデックス設計の未決事項を解決(CL-010、romaji-automaton.md/table-definition.md更新)。P3-08で`.claude/rules/typing-core.md`/`judgment-engine.md`を新規作成(P1-06と同じ理由で本セッション内は読み込み未確認)。見積もりは`/ty-plan`時点で前回の打ち手(誰が実際に手を動かすかを自問)を事前適用し、5タスク中5タスクでズレ率0%を達成 | P3-09(ゲート③)から。rules読み込み確認を最優先で |
| 2026-08-29〜30 | P3 | P3-09(ゲート③): doc/test/ops 3観点でレビュー実施(REV-010/011/012、重要度A計17件・重複除き15件)、全件クローズ(mora_list事前分割アーキテクチャの採用・KeystrokeResult拡張・状態保持の分担整理・送信失敗時の再送UI・シードデータのFlyway管理化 等)。修正直後の検証レビュー(REV-013)で自己修正が原因のA7件を新規検出、全件クローズ。B29+4件・C17+7件は`wbs.md`にフェーズ振り分け(P4/P5/P6-P8/P7/対象外)として申し送り、うち13件はA対応のついでに解消済み。Kazukiの最終確認完了。**ゲート③通過、P3完了** | P4タスク分解から。`wbs.md`のB/C振り分け表のP4担当分(test-B1/B2/B3, test-C1, test-C3/ops-C3, doc-B9/ops-B8/test-C4)を最初に拾う |
| 2026-08-30 | P4 | P4タスク分解(P4-00)、`test-plan.md`(P4-01、テストレベル定義・ID体系・shared/testdata形式・test-B1/B2/B3/C1解決)、`testcase-gen` skill(P4-02、初のskill整備)、`ut-cases.md`(P4-03、UT-001〜065)、`it-cases.md`(P4-04、IT-001〜017)、`st-cases.md`(P4-05、ST-001〜015)、`traceability-matrix.md`(P4-06、全FR-ID充足確認)を作成。Kazuki就寝中にP4-02〜06を一括ドラフトし、起床後にレビュー。レビュー中にUT-003の前提条件記述の甘さから設計ケース漏れ(session-metrics.mdの既定値条件が「または」なのに「両方0」の1ケースしか無かった)を発見しUT-003〜005に分割、後続ID全体を+2シフト。`byKana`のoccurrenceCount欠如(doc-B9/ops-B8/test-C4)もUT-065の境界値ケースから未解決と判明し、Kazukiと相談のうえ`byCharType`と同じ対応で解決(CL-016)。E2Eフレームワーク選定等の「P4-02で決める」という記述の誤りも訂正。**P4完了(ゲート無し、Kazuki確認のみ)** | P5タスク分解。着手時に相談: 他レイヤーの分担/shared/testdataの作成方針(決定済み、TDDで埋める)/E2Eフレームワーク選定 |
| 2026-08-30 | P5 | P5タスク分解(19タスク、wbs.mdに記録)。着手時相談で「typing-core以外はKazuki主体、詰まったらClaude相談」「shared/testdataはKazukiがTDDで埋める」「E2E/Testcontainersは保留」「hooks(PostToolUse)は固定タスクにせず困りごとが出たら検討」を決定。P5-01(`SessionMetricsCalculator`)着手直後、Maven/JUnit5/Jackson配線の環境構築だけで大半の時間を消費しロジック本体に未到達という状況になり、Kazukiから「学習効果が時間に見合わない」との申告を受け、**typing-core/judgment-engineもClaudeドラフトへ方針転換**(合意値3.0h→1.0hに改訂)。ドラフト後、`shared/testdata/session-metrics/cases.json`(SM-001〜006、UT-001〜006対応)を作成し全件Green。「困りごとが出たら検討」としていたhooks(PostToolUse)を実際に導入(Spotless `importOrder`/`removeUnusedImports`をWrite/Edit後に自動実行、動作確認済み。`googleJavaFormat`はJDK25と非互換のため除外)。テストは`@ParameterizedTest`化(1件失敗で残りが実行されない問題を解消)。ソースコードにコメント追加。P5-01完了時点でコミット(9e37a6d)。**P5-01完了** | P5-02(`AdviceGenerator`)から。Claudeドラフト方式で進める |
| 2026-09-06 | P5 | 前回セッション(P5-03)の実績記入漏れを補完(estimate-actual.mdに新規行追記、既存行は書き換えない方針を維持)。P5-04(`sequenceJudge.ts`)をClaudeドラフト方式で実装。着手時に設計書間の矛盾を2件発見: ①`test-plan.md`のRA-001ワークド例が`romaji-automaton.md`の改訂済みルール(`nextHint`最短優先、`confirmedText`は採用パターン表示)と不一致→CL-017で修正、②`class-design.md`の「`MoraSequence`は`moraList`をそのまま使う」記述が`api-spec.yaml`の実際の型(charTypeを持たないかな文字列配列)と不一致→CL-018で`sequenceJudge`内部にかな→文字種の分類処理を追加する方式に決定。実装後、Vitest 14件+`shared/testdata/romaji-automaton/cases.json`(RA-001〜011、11件)全Green。実装直後に「議論タイム」(コミット前にKazukiがコードを読んで質問するフェーズ)を経てからコミットする運用を今回は最初から守れた。**P5-04完了**。作業後、Kazukiから「今のアプリの様子を見たい」と要望があり、Docker(Postgres)+Spring Boot+Vite devサーバーを起動し、ブラウザで実際に「Vue→Java→PostgreSQL」の疎通を確認(現状はタイピング画面が無く「Hello from PostgreSQL」の1行表示のみ、と正直に説明した上で実施) | P5-05(Flyway migration)から |
| 2026-09-07 | P5 | P5-05(Flyway migration)着手。記録済みの次回の打ち手どおり、着手直後に役割分担(Claudeドラフト・Kazukiレビュー方式に変更)を確認してから着手し、見積もりも合意値1.0hに再設定(Kazuki見積1.5h→Flaywayが初挑戦で理解時間を多めに見た分と判明)。`V1__create_schema.sql`(TBL-01〜06全テーブル+db-access.md 6章の4インデックス)、`R__seed_topic_master.sql`(難易度3件・お題15文、拗音/促音/撥音/長音を各セット1回以上含む)を作成。途中、Spring Boot 4.1.1でFlyway自動設定が`spring-boot-flyway`という別モジュールに分離されており`flyway-core`単体追加では無反応(エラー無し)という点に手間取ったが、`spring-boot-starter-flyway`追加で解決。`docker compose up`→バックエンド起動でマイグレーション適用・シードデータ投入・`R__`再実行時の冪等性(重複しない)まで実機で確認。実績は合意値どおり1.0h。**P5-05完了** | P5-06(Entity + Repository)から |
| 2026-09-07 | P5 | P5-05完了後、Kazukiから「P5-06以降も毎回確認せず最初からClaudeドラフトを標準にするか」を提案し合意。P5-01・P5-05の2例が根拠(「次回の打ち手」の該当項目を解消・格上げ、[[p5_typing_core_hands_on]]メモリ更新)。P5-06(Entity + Repository)着手、見積もり合意値1.0h。`entity/`(User/TopicSet/Sentence/Session/MissRecord/SessionKanaCount + CharType/EndConditionType enum)、`repository/`(6本+db-access.md4章の集計クエリ用プロジェクション5種)を実装。`RepositorySmokeTest`で実DB(docker)に接続しfind系メソッド5件をGreen確認、`spring.jpa.hibernate.ddl-auto=validate`でEntity↔Flywayスキーマの整合性も起動時に検証できる状態にした。レビュー中にKazukiの指摘で`@Query`のJPQL/ネイティブSQLを文字列連結からText Blockに書き換え可読性改善。実績は合意値どおり1.0h。**P5-06完了** | P5-07〜11(backend Controller/Service)から |
| 2026-09-07 | P5 | P5-07〜11の着手順をKazukiと相談し、P5-11(共通例外基盤)→P5-07(User)→P5-08(TopicSet)→P5-09(Session)→P5-10(MissAnalysis)の順に決定(見積もりは全タスク前回合意値をそのまま再利用)。P5-11(`GlobalExceptionHandler`)着手。`dto/ErrorResponse`、`exception/`(`UserNotFoundException`/`TopicSetNotFoundException`/`InvalidSessionSubmissionException`+`GlobalExceptionHandler`)を実装、class-design.md 1.4の例外→応答対応表を反映。本物のControllerがまだ無いため`ThrowingTestController`(例外を投げるだけの仮Controller)経由の`@WebMvcTest`で5件Green確認。ここでもSpring Boot 4.1.1のモジュール分割(`@WebMvcTest`が`spring-boot-starter-webmvc-test`という別モジュール・別パッケージに移動)にぶつかったが、P5-05のFlyway分離と同型のパターンだったため調査は早かった。実績0.75h(合意値2.0h比-63%)。**P5-11完了** | P5-07(UserController/UserService)から |
| 2026-09-07 | P5 | P5-07(`UserController`/`UserService`)着手。設計書の矛盾2件を発見・修正: `InvalidRequestException`新設(CL-019、UserServiceのバリデーション失敗用の例外が未定義だった)、`UserService`/`TopicSetService`のメソッドシグネチャ表をDTO返却に修正(CL-020、Entity返却のままだと同節の「Serviceが必ずDTOに変換する」原則と矛盾していた)。実装後`UserServiceTest`(実DB5件)・`UserControllerTest`(`@WebMvcTest`1件)で確認、curl経由の実API疎通も確認(Windows curlの`-d`インライン日本語が文字化けする現象にぶつかったが、ファイル経由`--data-binary @file`で解決、アプリ側のバグではなかった)。レビューでKazukiが`GlobalExceptionHandlerTest`の冗長な`@Import(GlobalExceptionHandler.class)`を指摘、削除(`@WebMvcTest`が`@RestControllerAdvice`を自動検出するため不要だった)。実績2.0h(合意値どおり)。**P5-07完了** | P5-08(TopicSetController/TopicSetService)から |
| 2026-09-07 | P5 | P5-08(`TopicSetController`/`TopicSetService`)着手。`TopicSetServiceTest`(実DB3件、`R__`シードデータ前提)・`TopicSetControllerTest`(`@WebMvcTest`+モック3件)で確認中、`@PathVariable Long topicSetId`が実行時に500エラーになる不具合を発見。原因は`-parameters`コンパイラフラグが無くSpringが引数名をリフレクション解決できなかったこと。`backend/pom.xml`に`maven.compiler.parameters=true`を追加して解決(`spring-boot-starter-parent`の既定値をこのプロジェクトでは明示的に設定する必要があった)。curlでの実API疎通も確認。実績2.0h(合意値どおり)。**P5-08完了** | P5-09(SessionController/SessionService)から |
| 2026-09-07 | P5 | P5-08完了後、Kazukiの提案で`/code-review`(medium/high並列)による中間レビューを実施。8観点(A〜H)の並列調査により9件の指摘(NPE2件・DB整合性2件・重複/デッドコード4件・`sequenceJudge.ts`の二重確定1件)を発見、優先度順に全て修正・確認。うち2件(CHECK制約の非対称、押し戻し機構の組み合わせケース漏れ)は設計レビューで気づけたはずと判断し、`doc-reviewer`エージェントに観点を追加(つまずき・気づきログ参照)。P5-09(`SessionController`/`SessionService`、FR-04〜09)着手。存在確認→nullチェック→値域チェック→`SessionMetricsCalculator`呼び出し→自己ベストMAXクエリ→`@Transactional`保存→自己ベスト比較のフローを実装、履歴一覧はN+1回避のJOINプロジェクションを新設。`SessionServiceTest`(実DB13件)・`SessionControllerTest`(3件)で確認、curlで送信→履歴→自己ベストの一連を実API確認。実績4.0h(合意値どおり)。**P5-09完了** | P5-10(MissAnalysisController/MissAnalysisService)から |
| 2026-09-07 | P5 | P5-10(`MissAnalysisController`/`MissAnalysisService`、FR-10/FR-11)着手。`db-access.md` 4.3のクエリ結果を4観点に再集計し、既存の`AdviceGenerator`(P5-02実装済み)を呼び出すだけで完結。`CharType` enumの宣言順が`ordinal()`と一致するためbyCharTypeの固定順ソートに追加コード不要だった。`MissAnalysisServiceTest`(`SessionService`経由で実データ生成、実DB3件)・`MissAnalysisControllerTest`(2件)で確認、curlでの実API疎通も確認。実績3.0h(合意値どおり)。**P5-10完了、これでbackend(P5-05〜11)が全完了** | P5-12(frontend api/types)から |
| 2026-09-07 | P5 | `/ty-end`。今日完了した7タスク(P5-05〜11)のうちズレ率±30%を超えたのはP5-11(-63%)のみ。深掘りの結果、要因は「前回合意値をそのまま再利用する際、その合意値がどの実行方式(Kazuki主体/Claudeドラフト)前提の数字かを確認しなかったこと」と判明(Kazuki自身は経過時間の詳細を覚えておらず、Claude側の観察を基に整理)。estimate-actual.mdに深掘り行と直近3タスク(P5-08〜10、全て0%)の補正係数を追記。**本セッションでbackend(P5-05〜11)が全完了、次回はP5-12(frontend api/types)から** | |
| 2026-09-08 | P5 | 前回の打ち手(合意値を再利用する際は実行方式を確認する)を、Kazukiが見積もり時に自ら「Claudeドラフト方式で1.5h」と明示する形で実践。P5-12(frontend `api/client.ts`+各apiモジュール+`types/api.ts`)着手。`api-spec.yaml`の全スキーマをTS型に変換(`types/api.ts`)、fetchラッパー(`client.ts`、baseURL`/api`固定・90秒タイムアウト・`ErrorResponse`解析)、7エンドポイントを`operationId`と同名の関数でラップする4つのapiモジュールを実装。`vue-tsc -b`で`erasableSyntaxOnly`によるconstructor parameter property構文のエラーを検出し通常のフィールド代入に修正。レビュー中、Kazukiから「baseURL固定はハードコーディングとして仕方ないものか」「定数は名前を付けて定義しないのか」「`/users`のような繰り返し出現する文字列も定数化すべきか」の3点の質問があり、それぞれP3ゲート③ops-B4指摘の経緯・既にconstとして定義済みであること・`api-spec.yaml`との1:1対応を優先し定数化しない判断、を説明し合意。実績1.0h(合意値どおり)。**P5-12完了** | P5-13(stores)から |
| 2026-09-08 | P5 | P5-13(`userStore`/`topicStore`/`sessionStore`)着手。見積もりでsessionStoreの複雑度(状態を持つ集計ロジック)を理由にP5-04`sequenceJudge`相当と判定し合意値1.5hに設定(Kazuki当初1h→1.5hに自己改訂)。`userStore`/`topicStore`は薄く実装、`sessionStore`は`romaji-automaton.md`7.1の生成規則(`moraIndex`変化トリガの`kanaOccurrenceNo`採番、`correctKeyCount`/`kanaCounts`集計、終了条件判定、送信失敗時の再送)を実装。設計書に無い実装判断3点(localStorageキー名`typingApp.userId`/`typingApp.name`、セッション開始時刻と最初のキー入力時刻の分離、`completeSentence()`という新規メソッド)をKazukiに説明し了承を得た。レビュー中、Kazukiから「localStorageキーとは何か」「VitestのbeforeEach/describe/expect/it/viとは何か」「Piniaの2つの書き方(Options Store/Setup Store)の違い」の3点の質問があり説明、Options Storeのまま進めることで合意。テストにjsdom環境が必要と判明し`jsdom`を追加、`vite.config.ts`の`defineConfig`を`vitest/config`からに変更。実績1.0h(合意値1.5h比-33%、要因: `romaji-automaton.md`7.1に生成規則が既に確定済みで実装中に解くべき曖昧さがほぼ無く、複雑度を高めに見積もった分が短縮に効いた)。**P5-13完了** | P5-14〜17(views)から |
| 2026-09-08 | P5 | 「あと14だけやって終わろう」でP5-14(`NameInputView`/`HomeView`、S-01/S-02)のみ着手。`vue-router`が未導入(P5-18の担当)なため、遷移は各Viewが`emit`する方式(例: `HomeView`が`start`イベントをペイロード付きでemit)にし、実ルーティング配線はP5-18に委譲する方針を提案・合意。`NameInputView.vue`(名前入力・trim・`userStore.identifyUser`)、`HomeView.vue`(`topicStore.loadTopicSets`・お題セット/終了条件選択・NFR-09汎用エラー表示)を実装。終了条件の値域(1〜50/10〜600秒)は`api-spec.yaml`のバリデーション範囲をクライアント入力制約にも流用。`@vue/test-utils`を新規導入しコンポーネントテスト7件追加、全Green。見積もりはKazuki1h/Claude1.5hで1.5倍差だったが「これも1hで終わる気がする」とKazuki値のまま合意、実績も1.0hで的中(ズレ率0%)。**P5-14完了** | P5-15〜17(views続き)から |
| 2026-09-08 | P5 | `/ty-end`。本セッション完了3タスク(P5-12/13/14、全てfrontend初のClaudeドラフト)のうちP5-13(-33%)のみ±30%超。Kazukiに深掘りを聞いたが追加の要因は無く、実装時点で記録済みの要因(状態を持つロジックという「複雑度」を理由にP5-04相当と見積もったが、`romaji-automaton.md`7.1に生成規則が既に確定済みで解くべき曖昧さが無かった)をそのまま採用。P3-01〜03/P3-04〜08の対比に続く「Claudeドラフトタスクの速度は複雑度でなく設計書の曖昧さの有無で決まる」という教訓の2件目の裏付け事例として、つまずき・気づきログに追記した。estimate-actual.mdに補正係数(単純移動平均-11%)を追記。**本セッションでfrontend api/stores/views(NameInput/Home)まで完了** | |

---

## 次回の打ち手

> `/ty-end` で毎回1行書く。`/ty-plan` は次回の冒頭でこれを読み上げ、実行されたかを確認する。
> 打ち手が次のサイクルで実行されていなければ、それは振り返りではない。

- ~~P5-05以降(backend Controller/Service/Repository、frontend api/stores/views等、「Kazuki主体・詰まったらClaude相談」パターンの層)に着手する際は、着手直後に「今回も環境構築とドメインロジックの境界線をどこで引くか」を先に一言確認してから始める。~~ **→ 実行・解消済み(2026-09-07)。** P5-05(Flyway migration)着手時にこの確認を実際に行ったところ、P5-01と同じく「Kazuki主体」では回り道になることが2回目の実例で裏付けられたため、確認自体をやめてP5-06以降は最初からClaudeドラフト・Kazukiレビューを標準にする方針に格上げした(上記P5チェックリスト行参照)。「事前に確認する」打ち手は1回機能したら役目を終え、次は「確認不要にする」判断に進化する、という良い例になった

- ~~**(2026-09-05確定)Claude単独連続実行時のタスク区切り記録:** P5-01完了→P5-02着手→完了を`/ty-end`を挟まずに連続実行した結果、P5-02の実績記録・コミットが漏れ、次回`/ty-plan`(2026-09-05)で発覚・救済する事態になった(estimate-actual.md「P5-02」の要因欄参照)。今後はP5の各タスク完了ごとに必ずコミットする運用に切り替える(実績記入は`/ty-end`でまとめてでもよいが、コミット自体はタスク区切りで都度行う)。~~ **→ 実行・定着済み(2026-09-08時点でP5-05〜14まで10タスク連続で毎回個別コミットを確認済み)。**

- ~~**(2026-09-07確定)合意値の前提確認:** P5-11で唯一ズレ率±30%を超えた(-63%)。原因は「前回合意値をそのまま再利用する」際、その合意値がどの実行方式(Kazuki主体で書く/Claudeドラフト)を前提に設定されたものかを確認しなかったこと。次回以降、「前回合意値を再利用する」を選ぶ際は、その合意値がどちらの実行方式を前提にしたものかを一言確認してから採用する。~~ **→ 実行済み(2026-09-08)。** P5-12見積もり時にKazuki自身が「Claudeドラフト方式で1.5h」と実行方式を明示する形で実践された。

**(2026-09-08確定)Claudeドラフトタスクの複雑度評価:** P5-13(`sessionStore`)で、状態を持つロジックという「複雑度」を理由にP5-04相当と見積もり合意値を1.5hに引き上げたが、実績1.0h(-33%)。要因は設計書(`romaji-automaton.md`7.1)に生成規則が既に確定済みで、実装時に解くべき曖昧さがほぼ無かったこと。**次回以降、Claudeドラフトタスクを「複雑そうに見える」という理由で高く見積もる前に、「対応する設計書(logic-spec/class-design.md等)に未解決の判断が残っているか」を先に確認する。**残っていなければ複雑度に関わらず標準倍率(0.3〜0.5倍)を適用してよい。

---

## つまずき・気づきログ

| 日付 | 工程 | 内容 | 解決策・ポイント |
|---|---|---|---|
| 2026-08-23 | P0 | 見積もりを一律 1.0h × 7 + 一括バッファ 3.0h で置いた | 合計の勘は正確(10.0 vs Claude 9.5)。弱いのは**配分**。一律配分は分解ではなく等分であり、一括バッファは事後に帰属先を判定できないためズレ率が出せない |
| 2026-08-23 | P0 | ボトムアップ見積もりが計画値を否定した | P1 は計画時 2〜3セッション(5〜7.5h)→ 積み上げると 4セッション(10.0h)。**根拠のある積み上げ側を採用**して WBS を修正。P2 以降も分解時に上振れる可能性が高い |
| 2026-08-23 | P0 | 別セッションが作った P0 成果物を上書きした | 原因は `/ty-plan` の「現在地を把握する」が **git を読んでいなかった**こと。現在地はファイルの中身だけでなくリポジトリの状態も含む。対策は CLAUDE.md への規約追加ではなく、**`/ty-plan` に git 確認を、`/ty-end` にコミットを入れる**こと(手順の穴は手順で塞ぐ) |
| 2026-08-23 | P1 | `docs/_index.md` を見ずに use-cases.md 等の doc_id を独自採番(PRJ-101〜103)してしまい、既に予約済みだった REQ-001〜003 と衝突した | 新規文書を作る前は台帳(`docs/_index.md`)を必ず確認する。P0 の教訓(現在地把握にはリポジトリ状態も含む)と同種で、**文書管理台帳も「現在地」の一部** |
| 2026-08-23 | P1 | `.claude/agents/doc-reviewer.md` を作成したが、同一セッション内では Agent tool から認識されなかった | カスタムエージェント定義はセッション起動時に読み込まれるため、**作成した直後の同一セッションでは動作確認できない**。次回セッション冒頭での起動確認が必須 |
| 2026-08-23 | P1 | ゲート①正式レビューで B1(リスク対策表の指標未反映)/B2(自己ベスト・履歴0件時の挙動未定義)が残った | ブロッカーではないためP2に引き継ぐ。B1はcharter.md 6章、B2は画面設計(screen-design.md)着手時に対応する |
| 2026-08-23 | P1 | P1-07(ゲート①)の合意値1.0hに対し実働5分(ズレ率-90%) | 見積もりが「自分でレビューし指摘対応で手戻りが発生する」前提だったが、実際はdoc-reviewerへの委譲+事前の中間レビューでの指摘潰し込みによりほぼ待ちだけで終わった。レビュー系タスクはエージェント委譲を前提に見積もる |
| 2026-08-23 | P2 | system-architecture.md執筆中、ADR-002(判定はフロントエンド完結)を決めた直後の「モジュール構成/二重実装」節で、古い前提(Javaが原本)を検算せずに書いてしまった | 自分が別の節(データフロー)に書いた内容と、決定を下した節を突き合わせていなかったのが原因。同一文書内の節どうしの矛盾は、複数文書をまたぐdoc-reviewerより人間の方が気づきやすい。Kazukiが必ず自分で読むべき文書とdoc-reviewerに任せてよい文書の切り分けを整理した(Claudeのメモリに保存) |
| 2026-08-23 | P2 | セッション経過時間を「見積もり合意値の合計」で判断しようとし、5時間経過したと誤って報告した | 見積もり(これから使う労力の目安)と実績(実際に経過した時間)を混同していた。ファイルのタイムスタンプで実経過を確認したところ実際は約25分だった。以後、休憩判断は実経過時間(ファイルタイムスタンプ等)かKazukiの体感を基準にする |
| 2026-08-23 | P2 | P2-03のテーブル設計中、Kazukiから「自由入力＋バックスペースを使った事後診断型」の入力モデル案が出た。既存FR-02/03/04(ブロッキング型、P1ゲート①済み)とは別物 | 良いアイデアだが、要件を覆す規模の変更のためMVPには含めず、charter.md 3.2の拡張バックログに「既存モードと選択できる別モード」として記録し、現行のブロッキング型のままP2を進めた |
| 2026-08-23 | P2 | `.claude/agents/doc-reviewer.md` に `model` の指定がなく、呼び出し元セッション(Sonnet)を継承していたことが判明 | `model: opus` を追加した。ただしP1-06と同じ理由でセッション内では反映確認できないため、次回セッション冒頭で確認する |
| 2026-08-26 | P2 | test-reviewer/ops-reviewerを初めて実行したところ、doc-reviewerが既に指摘していた「4xx未定義」「isNewBest判定基準」を、doc-reviewerとは異なる角度(テスト可能性/運用可能性)から独立に再指摘した | 観点を分離した複数レビュアーが同じ根本原因に別角度から到達するのは、その指摘の優先度が高いことの傍証になる。逆に1レビュアーしか拾わない指摘は、他観点では問題にならない程度という判断材料にもなる |
| 2026-08-26 | P2 | ops-reviewerが「NFR-08バックアップに委ねる」を、Render無料枠で実際に提供されるか未検証のまま前提化していたと指摘(A2) | 設計書に「〜に委ねる」と書くだけでは、その前提が真かどうかの確認をサボる免罪符になりうる。運用観点のレビューは「方針が書いてあるか」ではなく「その方針の前提が確認済みか」まで見る必要がある |
| 2026-08-26 | P2 | P2-06a(+172%)/P2-06b(-53%)/P2-07(-50%)の直近3タスクでズレ率の移動平均を出そうとしたら、符号が割れて+23%という無意味な数字になった | ズレ率は「レビュー起動+人間はほぼ判断しないタスク」と「指摘を受けて実際に複数ファイルを書き直すタスク」で符号・大きさの傾向が逆になる。この2種類を混ぜて移動平均を取っても補正係数として意味を持たない。P8ではタスクの性質(委譲型 / 手戻り型)で分けて集計する |
| 2026-08-29 | P2.5 | deployment.md確定・Renderの実サービス作成後にWeb Serviceの初回ビルドが`mvn: command not found`で失敗。RenderのネイティブランタイムはNode.js/Python/Ruby/Go/Rust/Elixirのみで**Javaに非対応**と判明し、Dockerfileへの切替が必要になった | 外部PaaSを使う設計(deployment.md)を書く前に、そのサービスの「対応言語/ランタイム一覧」を確認していなかった。技術選定(Java+SpringBoot)を先に決めていたため、デプロイ方式の設計は選定後の後付けになっていた。次回以降、新しい外部サービスを使う設計をする際は、着手前に対応言語/ランタイムの制約を必ず確認する |
| 2026-08-29 | P2.5 | GitHubリポジトリをPublicで新規作成する直前、Kazukiから「pushする内容に個人情報が入っていないか毎回チェックし、見つかったら無断でpushせず相談してほしい」という恒久ルールの要望が出た | 一回性の確認では済まないため、`CLAUDE.md`に「git push前の確認」セクションとして追記した(プロジェクトの標準ルールとして定着させる形。Claude Codeの汎用メモリではなくプロジェクト固有のCLAUDE.mdに置いたのは、このルールがtyping-appのgit運用に紐づくため) |
| 2026-08-29 | P3 | P3-01(3.0h→実績0.75h、-75%)・P3-03(1.25h→実績0.75h、-40%)が大きく外れた。要因は「Claudeドラフト・Kazuki意思決定のみ」という既知パターン(P1-07/P2-05/P2-06b/P2-07/P2.5-06と同型)で、**前回セッション(P2.5)で明文化した打ち手として知っていたにもかかわらず、見積もり時に「疑似コードという内容の目新しさ」に引きずられて適用し忘れた** | 打ち手を知っていることと、見積もりの瞬間にそれを思い出して適用することは別問題。次回の打ち手はより強く・具体的に(「疑似コード執筆でも例外にしない」等)書く必要がある |
| 2026-08-29 | P3 | Kazukiから「一読でどこまで拾えているか自信がない」「Fixed文書を気にせず上流に戻って直しているが最適か分からない」という不安が出た。実際にdoc-reviewerがKazukiの一読では気づけなかった重要度A6件(んのn/nn押し戻し欠陥など)を検出していた | `workflow.md`の「同じ会話にいるClaudeは自分の設計を肯定しやすいため独立コンテキストのレビュアーに読ませる」という設計思想は、Kazuki自身の一読チェックにも同じ理屈で当てはまる。**一読で全部拾う必要はなく、拾いきれない前提でdoc-reviewerに機械的にチェックさせる二段構えが、今回A6件検出という形で実際に機能した。** Fixed文書の軽い修正(change-log記録)も個人開発の規模には妥当と判断し、GitHub Issues等の追加導入はP6のbug-list.mdで足りるかを見てから判断することにした |
| 2026-08-29 | P3 | 同日のP3-01〜03セッションで「教訓を知っていても見積もり時に適用し忘れる」ことに気づいた直後、P3-04セッションの`/ty-plan`冒頭でその教訓を**着手前に**自問する運用に切り替えたところ、P3-04〜08の5タスク全てでズレ率0%を達成した(estimate-actual.md参照) | 同じ教訓でも「知っている」→「実績を見てから事後的に気づく」→「見積もりの瞬間に事前適用する」という3段階があり、精度向上は最後の段階に到達して初めて効く。P3-01〜03(事後)とP3-04〜08(事前)という直後の2セッションで対照実験のような形になったのは偶然だが、**教訓の定着度を測る具体的な基準(「次回の見積もりの最初の一手として自問しているか」)**が得られた。汎用性が高い気づきのためVault投下を検討する |
| 2026-08-29 | P3 | P3中間レビュー(REV-009)でB6(撥音んの次拍がな行の場合も"n"/"nn"衝突が起きる)として重要度Bに分類されていたが、精査するとA2と同じ実害(実際のミス誤判定)を持つ欠陥だった | **レビューの重要度分類(A/B/C)は鵜呑みにせず、指摘内容を読んで自分でも重大度を再評価する価値がある。** レビュアーは「網羅的に拾う」ことを優先するため、実害の大小の判定が必ずしも正確とは限らない |
| 2026-08-29〜30 | P3 | ゲート③のA指摘15件を自分(同一会話のClaude)が修正ドラフトを書いて対応した後、念のため独立コンテキストのdoc-reviewerでもう一度検証したところ(REV-013)、修正そのものが原因の新規A指摘が7件見つかった | 「同じ会話にいるClaudeは自分の設計を肯定しやすい」というworkflow.mdの設計思想は、指摘"対応"の修正ドラフトにも同じ理屈で当てはまることが実証された。自己修正後の検証パスは省略せず標準工程化する価値がある(次回の打ち手参照) |
| 2026-08-30 | P4 | Kazukiが`ut-cases.md`をレビュー中、UT-003の前提条件「両方0」に「これ何?」と引っかかり、概要欄を読んで理解できた、という些細な違和感を報告した | 実際に調べると「概要を読めば分かる」で済む話ではなく、`session-metrics.md`の既定値条件が「durationSeconds=0**または**総キー入力数=0」(OR)なのに、テストケースは「両方0」(AND)の1ケースしか作っておらず、片方だけ0のケースが2つ漏れていた。**「前提条件の書き方が分かりにくい」という表層の違和感が、テストケース設計そのものの網羅性不足という実質的な欠陥の入り口になった。** レビューで「気持ち悪い」と感じた箇所は、たとえ表現の問題に見えても中身まで調べる価値がある |
| 2026-08-30 | P4 | UT-003を3ケースに分割した際、後続63件のIDを+2シフトさせる作業をperlの正規表現一括置換で行ったところ、`traceability-matrix.md`の「UT-032〜034」のような範囲省略表記(2つ目の番号に`UT-`接頭辞が無い)を正しく変換できず、一部が破損した | 機械的な一括置換は、対象の記法が完全に均一(全箇所が同じパターン)であることを事前に確認しないと事故る。今回は「個別ID」と「範囲省略表記」が混在しており、後者を見落とした。**置換後は差分をそのまま信じず、内容を読んで検算する**(今回はut-cases.md側で全ID出現をsortして連番の欠け・重複が無いか機械的に確認し、traceability-matrix.md側は手でFR-IDごとに再集計して直した) |
| 2026-08-30 | P5 | P5着手時、「実装力を身につける」目的で`typing-core`をKazuki自身がTDDで書く方針にしたが、実際にP5-01(`SessionMetricsCalculator`)を始めると、Maven依存関係追加・JUnit5配線・Jacksonでのshared/testdata読み込みといった**環境構築だけで大半の時間が溶け**、肝心のロジック実装(数式の実装)にまだ1行も到達していなかった | P3で「設計書を読んで判断するだけでは実装力が身につかない」という懸念から生まれた方針は、対象を「ロジックそのものを書くこと」と想定していたが、実際に発生した負荷は主にビルドツール・ライブラリ配線という**ロジックとは別種のスキル**だった。方針を決める時点では「どの作業が学習目的に直結するか」の解像度が粗く、「typing-core全部」と大きく括ってしまっていた。**同日中に方針転換**し、環境構築はClaudeが引き取り、ロジック本体のみKazukiが書く(または今回のように全面Claudeドラフトに切り替える)形にした。次に類似の「学習目的で手を動かす」方針を立てる時は、対象タスクを「ドメインロジック」と「配線・環境構築」に事前に分けておくと同じ回り道を避けられる |
| 2026-09-07 | P5 | P5-05〜11完了時点でコードレビュー(`/code-review` medium/high並列)を実施したところ、9件の指摘のうち2件は「設計書の時点で気づけたはずのもの」だった。①`table-definition.md`のTBL-05/TBL-06で同じ値域(`char_type`)の一方にだけCHECK制約が付いていない非対称(CL-021)、②`romaji-automaton.md` 6章の「ん」押し戻し機構は2026-08-29に2件の欠陥(REV-009/REV-013)を修正済みだったが、その2件とは別の3件目の組み合わせケース(1キーで2拍が同時に確定する場合)が未検出のまま残っていた | ①は「同じ概念が複数箇所に登場する時、片方だけ直して他方を直し忘れる」パターンで、CL-003/CL-008/CL-011に続き**4回目の再発**。②は「一度複数回修正した箇所は、その後も組み合わせ漏れが起きやすい要注意地帯として扱うべき」という教訓。どちらも**Kazukiが自分で読んで気づくというより、doc-reviewerのような機械的な突き合わせ観点を持つレビュアーが担うべき指摘**と判断し、`doc-reviewer`エージェントのレビュー観点に「横展開漏れ」「組み合わせケースの再点検」を追加した(次回このエージェントを使う機会があれば効果を確認する) |
| 2026-09-08 | P5 | P5-13(`sessionStore`)の見積もりで、状態を持つ集計ロジックという「複雑度」を理由にP5-04(`sequenceJudge`)相当と判断し合意値を1.5hに引き上げたが、実績は1.0h(-33%)。P3-01〜03(疑似コード執筆という内容の目新しさに引きずられ見積もりが外れた)と似た構図だが、今回外れた向きは「複雑そうに見えて実は速かった」という逆方向 | `romaji-automaton.md`7.1に「かなの種類ごとの出現連番カウンタをmoraIndexの変化で+1する」等の生成規則が既に確定済みの疑似コードとして書かれており、実装時に新たに解くべき設計判断がほぼ無かった。**Claudeドラフトタスクの所要時間を左右するのは、ロジックの複雑度(状態の数・分岐の数)そのものではなく、設計書側に未解決の曖昧さが残っているかどうか**という軸がP3の対比(P3-01〜03 vs P3-04〜08)に続き2件目の事例で裏付けられた。次回以降、Claudeドラフトタスクを見積もる際は「複雑に見えるか」ではなく「設計書に迷う余地が残っているか」を先に確認する |
