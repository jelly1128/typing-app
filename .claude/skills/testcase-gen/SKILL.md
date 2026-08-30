---
name: testcase-gen
description: typing-app のUT/IT/STケースを、設計書(class-design.md/logic-spec/api-spec.yaml等)とtest-plan.mdの規約から機械的に下書きする。P4(テスト設計)、または実装中に対応するテストケースが漏れていることに気づいた時に使う。
---

`docs/40_test/test-plan.md` の規約(ID体系・テストレベル定義・`shared/testdata`形式)に従い、指定された対象(FR-ID、クラス名、またはファイルパス)からテストケースを下書きする。

## 手順

1. `docs/40_test/test-plan.md` を読み、ID体系(UT-xxx/IT-xxx/ST-xxx)とレベル定義を確認する
2. 対象が FR-ID の場合、`docs/30_detail-design/class-design.md` のFR-IDトレーサビリティ表(1.5節・2.8節)から対応クラス・モジュールを特定する
3. 対応する設計書を読む
   - `typing-core`/`judgment-engine`が対象 → `docs/30_detail-design/logic-spec/*.md` の「shared/testdataへの申し送り」節を主な入力にする(既に境界値・異常系の観点が列挙されている)
   - `api`(Controller/Service)が対象 → `class-design.md` 1.4のメソッドシグネチャ表、`api-spec.yaml`の4xx条件を主な入力にする
4. 正常系1件以上・境界値/異常系を設計書に書かれている分だけ、テストケースを下書きする。各ケースは以下の列を持つ

   | 列 | 内容 |
   |---|---|
   | ID | UT-xxx / IT-xxx / ST-xxx(該当ファイルの末尾連番を引き継ぐ) |
   | 対象 | クラス.メソッド、または 画面/API |
   | 概要 | 何を検証するか(1行) |
   | 前提条件 | 入力データ・DB状態など |
   | 期待結果 | 出力・状態変化 |
   | 対応FR-ID | 1件以上 |
   | testdata ID | UTかつ`shared/testdata`を使う場合のみ(`RA-xxx`等) |

5. 該当する `docs/40_test/ut-cases.md` / `it-cases.md` / `st-cases.md` の末尾に追記する(既存IDと重複させない)
6. 追記後、`docs/40_test/traceability-matrix.md` の対応FR-ID行を更新する

## やってはいけないこと

- テストケースの下書きに留める。実際のテストコード(JUnit/Vitest)は書かない(P5の実装工程で書く)
- `shared/testdata`のtestdata本体(JSON)は生成しない。テストケースが「どのtestdata IDを使うか」を示すだけにとどめ、testdata自体の作成はP4-03着手時にケースと一緒に検討する
- 設計書に書かれていない仕様を推測して期待結果を作らない。曖昧な場合は設計書側に未決事項として明記し、テストケース側は「要確認」と書く
