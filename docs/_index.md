---
doc_id: IDX-001
status: fixed
updated: 2026-08-22
---

# 文書管理台帳

全成果物の一覧とステータス。新しい文書を作ったら**必ずこの表に追加する**。

**status の意味:** `draft`(作成中) / `review`(レビュー待ち) / `fixed`(ゲート通過済み・変更は change-log 経由)

## P0 プロジェクト計画

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| CHT-001 | プロジェクト憲章 | `00_project/charter.md` | draft | - |
| WBS-001 | WBS・見積もり | `00_project/wbs.md` | draft | - |
| EST-001 | 見積もり/実績記録 | `00_project/estimate-actual.md` | (追記専用) | - |
| CHG-001 | 変更管理票 | `00_project/change-log.md` | (追記専用) | - |

## P1 要件定義

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| REQ-001 | 要件定義書 | `10_requirements/requirements.md` | 未着手 | - |
| UC-001 | ユースケース記述 | `10_requirements/use-cases.md` | 未着手 | - |
| GLS-001 | 用語集 | `10_requirements/glossary.md` | 未着手 | - |

## P2 基本設計

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| ARC-001 | システム構成 | `20_basic-design/system-architecture.md` | 未着手 | - |
| SCR-001 | 画面設計書 | `20_basic-design/screen-design.md` | 未着手 | - |
| API-001 | API 仕様 | `20_basic-design/api-spec.yaml` | 未着手 | - |
| ERD-001 | ER 図 | `20_basic-design/er-diagram.md` | 未着手 | - |
| TBL-001 | テーブル定義 | `20_basic-design/table-definition.md` | 未着手 | - |
| NFD-001 | 非機能設計 | `20_basic-design/nonfunctional-design.md` | 未着手 | - |
| DPL-001 | デプロイ設計 | `20_basic-design/deployment.md` | 未着手 | - |

## P3 詳細設計

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| CLS-001 | クラス設計 | `30_detail-design/class-design.md` | 未着手 | - |
| SEQ-001 | シーケンス図 | `30_detail-design/sequence.md` | 未着手 | - |
| LGC-001 | ローマ字入力受理オートマトン仕様 | `30_detail-design/logic-spec/romaji-automaton.md` | 未着手 | - |
| DBA-001 | DB アクセス設計 | `30_detail-design/db-access.md` | 未着手 | - |

## P4 テスト設計

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| TPL-001 | テスト計画 | `40_test/test-plan.md` | 未着手 | - |
| UTC-001 | 単体テストケース | `40_test/ut-cases.md` | 未着手 | - |
| ITC-001 | 結合テストケース | `40_test/it-cases.md` | 未着手 | - |
| STC-001 | 総合テストケース | `40_test/st-cases.md` | 未着手 | - |
| TRC-001 | トレーサビリティマトリクス | `40_test/traceability-matrix.md` | 未着手 | - |

## P6〜P8

| doc_id | 文書 | パス | status | レビュー |
|---|---|---|---|---|
| TRS-001 | テスト結果 | `40_test/test-results.md` | 未着手 | - |
| BUG-001 | バグ管理表 | `40_test/bug-list.md` | 未着手 | - |
| RLS-001 | リリースノート | `50_release/release-note.md` | 未着手 | - |
| OPS-001 | 運用手順 | `50_release/operation.md` | 未着手 | - |
| RTR-001 | プロジェクト振り返り | `00_project/retrospective.md` | 未着手 | - |
