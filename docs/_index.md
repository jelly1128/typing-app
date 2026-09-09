---
doc_id: IDX-001
status: fixed
updated: 2026-09-10
---

# 文書管理台帳

全成果物の一覧とステータス。**新しい文書を作ったら必ずここに追加する。**

`status` の意味: `draft`(執筆中) / `review`(レビュー待ち) / `fixed`(確定・ゲート通過済み)

## 00_project — プロジェクト管理

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| PRJ-001 | [charter.md](./00_project/charter.md) — プロジェクト憲章 | fixed | [review-20260823_p1-gate1.md](./90_review/review-20260823_p1-gate1.md) |
| PRJ-002 | [wbs.md](./00_project/wbs.md) — WBS と見積もり | draft | — |
| PRJ-003 | [estimate-actual.md](./00_project/estimate-actual.md) — 見積もり/実績記録 | fixed | — |
| PRJ-004 | [change-log.md](./00_project/change-log.md) — 変更管理票 | fixed | — |

## 10_requirements — 要件定義(P1)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| REQ-001 | [requirements.md](./10_requirements/requirements.md) — 要件定義書(FR / NFR) | fixed | [interim](./90_review/review-20260823_p1-interim.md) / [gate①](./90_review/review-20260823_p1-gate1.md) |
| REQ-002 | [use-cases.md](./10_requirements/use-cases.md) — ユースケース | fixed | [interim](./90_review/review-20260823_p1-interim.md) / [gate①](./90_review/review-20260823_p1-gate1.md) |
| REQ-003 | [glossary.md](./10_requirements/glossary.md) — 用語集 | fixed | [glossary](./90_review/review-20260823_glossary.md) / [gate①](./90_review/review-20260823_p1-gate1.md) |

## 20_basic-design — 基本設計(P2 / P2.5)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| BD-001 | [system-architecture.md](./20_basic-design/system-architecture.md) — システム構成 | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) |
| BD-002 | [screen-design.md](./20_basic-design/screen-design.md) — 画面設計 | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) / [test](./90_review/review-20260826_p2-gate2-test.md) / [ops](./90_review/review-20260826_p2-gate2-ops.md) / [P3ゲート③検証](./90_review/review-20260829_p3-gate3-verify.md)(CL-013) |
| BD-003 | [api-spec.yaml](./20_basic-design/api-spec.yaml) — API 仕様(OpenAPI) | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) / [test](./90_review/review-20260826_p2-gate2-test.md) / [ops](./90_review/review-20260826_p2-gate2-ops.md) |
| BD-004 | [er-diagram.md](./20_basic-design/er-diagram.md) — ER 図 | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) |
| BD-005 | [table-definition.md](./20_basic-design/table-definition.md) — テーブル定義 | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) / [test](./90_review/review-20260826_p2-gate2-test.md) / [ops](./90_review/review-20260826_p2-gate2-ops.md) |
| BD-006 | [nonfunctional-design.md](./20_basic-design/nonfunctional-design.md) — 非機能設計 | fixed | [interim](./90_review/review-20260823_p2-interim.md) / [opus中間](./90_review/review-20260823_p2-interim-opus.md) / [opus検証](./90_review/review-20260823_p2-verify-opus.md) / [test](./90_review/review-20260826_p2-gate2-test.md) / [ops](./90_review/review-20260826_p2-gate2-ops.md) |
| BD-007 | [deployment.md](./20_basic-design/deployment.md) — デプロイ構成 | fixed | — |

## 30_detail-design — 詳細設計(P3)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| DD-001 | [class-design.md](./30_detail-design/class-design.md) — クラス設計 | fixed | [gate③doc](./90_review/review-20260829_p3-gate3.md) / [gate③test](./90_review/review-20260829_p3-gate3-test.md) / [gate③ops](./90_review/review-20260829_p3-gate3-ops.md) |
| DD-002 | [sequence.md](./30_detail-design/sequence.md) — シーケンス図 | fixed | 同上 |
| DD-003 | [logic-spec/romaji-automaton.md](./30_detail-design/logic-spec/romaji-automaton.md) — ローマ字入力受理オートマトン仕様 | fixed | [interim](./90_review/review-20260829_p3-interim.md) / 同上 |
| DD-004 | [db-access.md](./30_detail-design/db-access.md) — DB アクセス設計 | fixed | 同上 |
| DD-005 | [logic-spec/session-metrics.md](./30_detail-design/logic-spec/session-metrics.md) — セッション集計計算仕様 | fixed | [interim](./90_review/review-20260829_p3-interim.md) / 同上 |
| DD-006 | [logic-spec/advice-generation.md](./30_detail-design/logic-spec/advice-generation.md) — 改善アドバイス生成仕様 | fixed | [interim](./90_review/review-20260829_p3-interim.md) / 同上 |

## 40_test — テスト(P4 / P6)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| TST-001 | [test-plan.md](./40_test/test-plan.md) — テスト計画 | fixed | — |
| TST-002 | [ut-cases.md](./40_test/ut-cases.md) — 単体テストケース | fixed | — |
| TST-003 | [it-cases.md](./40_test/it-cases.md) — 結合テストケース | fixed | — |
| TST-004 | [st-cases.md](./40_test/st-cases.md) — 総合テストケース | fixed | — |
| TST-005 | [traceability-matrix.md](./40_test/traceability-matrix.md) — トレーサビリティマトリクス | fixed | — |
| TST-006 | test-results.md — テスト結果 | 未着手 | — |
| TST-007 | bug-list.md — バグ一覧 | 未着手 | — |

## 50_release — リリース(P7)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| REL-001 | release-note.md — リリースノート | 未着手 | — |
| REL-002 | operation.md — 運用手順 | 未着手 | — |

## 90_review — レビュー指摘票

| ファイル | 対象 | 重要度A残 |
|---|---|---|
| [review-20260823_p1-interim.md](./90_review/review-20260823_p1-interim.md) | charter.md / use-cases.md / requirements.md(P1中間レビュー) | 0(全件クローズ) |
| [review-20260823_glossary.md](./90_review/review-20260823_glossary.md) | glossary.md(P1-06 doc-reviewer 動作確認) | 0(A1クローズ) |
| [review-20260823_p1-gate1.md](./90_review/review-20260823_p1-gate1.md) | charter.md / use-cases.md / requirements.md / glossary.md / ADR-001(P1 ゲート①正式レビュー) | 0(該当なし) |
| [review-20260823_p2-interim.md](./90_review/review-20260823_p2-interim.md) | system-architecture.md / screen-design.md / api-spec.yaml / er-diagram.md / table-definition.md / nonfunctional-design.md(P2中間レビュー、Sonnet) | 0(全件クローズ) |
| [review-20260823_p2-interim-opus.md](./90_review/review-20260823_p2-interim-opus.md) | 同上(P2中間レビュー、Opus再レビュー) | 0(A1〜A3クローズ済み) |
| [review-20260823_p2-verify-opus.md](./90_review/review-20260823_p2-verify-opus.md) | 同上(P2ゲート②doc観点、Opus検証レビュー) | 0(該当なし) |
| [review-20260826_p2-gate2-test.md](./90_review/review-20260826_p2-gate2-test.md) | 同上(P2ゲート②test観点) | 0(A1〜A3クローズ済み) |
| [review-20260826_p2-gate2-ops.md](./90_review/review-20260826_p2-gate2-ops.md) | 同上(P2ゲート②ops観点) | A2のみ残(P2.5着手時対応。`wbs.md`に申し送り済み) |
| [review-20260829_p3-interim.md](./90_review/review-20260829_p3-interim.md) | romaji-automaton.md / session-metrics.md / advice-generation.md(P3中間レビュー) | 0(A1〜A6全件クローズ。B/Cはゲート③までに対応予定) |
| [review-20260829_p3-gate3.md](./90_review/review-20260829_p3-gate3.md) | class-design.md / sequence.md / db-access.md / logic-spec 3本(P3ゲート③doc観点、REV-010) | 0(A1〜A7全件クローズ。B9件・C9件は申し送り) |
| [review-20260829_p3-gate3-test.md](./90_review/review-20260829_p3-gate3-test.md) | 同上(P3ゲート③test観点、REV-011) | 0(A1〜A8全件クローズ。B10件・C4件は申し送り) |
| [review-20260829_p3-gate3-ops.md](./90_review/review-20260829_p3-gate3-ops.md) | 同上(P3ゲート③ops観点、REV-012) | 0(A1〜A2全件クローズ。B10件・C4件は申し送り) |
| [review-20260829_p3-gate3-verify.md](./90_review/review-20260829_p3-gate3-verify.md) | class-design.md/sequence.md/db-access.md/logic-spec 3本(A15件修正直後の検証レビュー、REV-013) | 0(A1〜A7全件クローズ。B4件・C7件は申し送り) |
| [review-20260910_p5-interim.md](./90_review/review-20260910_p5-interim.md) | frontend views(P5-15〜17、`/code-review`medium/high並列、REV-014) | A1未対応(次回セッションで対応。B3件・C3件も申し送り。P5-09〜14は未レビューのまま申し送り) |

## decisions — ADR(意思決定記録)

| ADR | 決定内容 | 日付 |
|---|---|---|
| [ADR-001](./00_project/decisions/001-auth-out-of-scope.md) | 認証機能を MVP から除外する | 2026-08-23 |
| [ADR-002](./00_project/decisions/002-realtime-judgment-frontend.md) | リアルタイムのローマ字判定はフロントエンド完結にする | 2026-08-23 |
| [ADR-003](./00_project/decisions/003-userid-enumeration-accepted-risk.md) | userId 推測による他人データ閲覧リスクを受け入れる | 2026-08-23 |
| [ADR-004](./00_project/decisions/004-long-vowel-hyphen-key.md) | 長音「ー」はハイフンキー"-"1つで確定する(P1確定の母音延長方式を上書き) | 2026-08-29 |
