---
doc_id: IDX-001
status: fixed
updated: 2026-08-23
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
| BD-001 | [system-architecture.md](./20_basic-design/system-architecture.md) — システム構成 | draft | — |
| BD-002 | [screen-design.md](./20_basic-design/screen-design.md) — 画面設計 | draft | — |
| BD-003 | [api-spec.yaml](./20_basic-design/api-spec.yaml) — API 仕様(OpenAPI) | draft | — |
| BD-004 | [er-diagram.md](./20_basic-design/er-diagram.md) — ER 図 | draft | — |
| BD-005 | [table-definition.md](./20_basic-design/table-definition.md) — テーブル定義 | draft | — |
| BD-006 | [nonfunctional-design.md](./20_basic-design/nonfunctional-design.md) — 非機能設計 | draft | — |
| BD-007 | deployment.md — デプロイ構成 | 未着手 | — |

## 30_detail-design — 詳細設計(P3)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| DD-001 | class-design.md — クラス設計 | 未着手 | — |
| DD-002 | sequence.md — シーケンス図 | 未着手 | — |
| DD-003 | logic-spec/romaji-automaton.md — ローマ字入力受理オートマトン仕様 | 未着手 | — |
| DD-004 | db-access.md — DB アクセス設計 | 未着手 | — |

## 40_test — テスト(P4 / P6)

| doc_id | 文書 | status | レビュー |
|---|---|---|---|
| TST-001 | test-plan.md — テスト計画 | 未着手 | — |
| TST-002 | ut-cases.md — 単体テストケース | 未着手 | — |
| TST-003 | it-cases.md — 結合テストケース | 未着手 | — |
| TST-004 | st-cases.md — 総合テストケース | 未着手 | — |
| TST-005 | traceability-matrix.md — トレーサビリティマトリクス | 未着手 | — |
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
| [review-20260823_p2-interim.md](./90_review/review-20260823_p2-interim.md) | system-architecture.md / screen-design.md / api-spec.yaml / er-diagram.md / table-definition.md / nonfunctional-design.md(P2中間レビュー) | 0(全件クローズ) |

## decisions — ADR(意思決定記録)

| ADR | 決定内容 | 日付 |
|---|---|---|
| [ADR-001](./00_project/decisions/001-auth-out-of-scope.md) | 認証機能を MVP から除外する | 2026-08-23 |
| [ADR-002](./00_project/decisions/002-realtime-judgment-frontend.md) | リアルタイムのローマ字判定はフロントエンド完結にする | 2026-08-23 |
