# typing-app — Claude Code 指示書

日本語タイピングアプリを**ウォーターフォール型の工程**で開発するプロジェクト。共通ルール(応答スタイル / 音声入力 / Vault 連携)は [親 CLAUDE.md](../CLAUDE.md) を参照。

工程の全体像・完了条件・コマンド一覧は [workflow.md](./workflow.md)、現在地は [progress.md](./progress.md) を参照する。

## typing-app 固有のルール

### 工程の原則
- **セッション開始時は必ず `progress.md` を読み、現在の工程を確認してから作業を提案する**
- 工程を飛ばさない。前工程のレビューゲートが通るまで次工程の成果物を書かない
- 実装中に設計との差異が見つかったら、**先に設計書を直してから**コードを書く。差異は `docs/00_project/change-log.md` に記録する
- 却下した案とその理由は `docs/00_project/decisions/` に ADR として残す

### 見積もりの順序(厳守)
- 見積もりは**必ず Kazuki が先に言う**。Claude の見積もりを先に見せると引っ張られ、見積もり訓練にならない
- Kazuki の値を聞いた後に Claude が独立した見積もりを出し、差分の根拠を突き合わせてから合意値を記録する

### 成果物のトレーサビリティ
- 要件は `FR-xx` / `NFR-xx`、テーブルは `TBL-xx`、テストケースは `UT-xxx` / `IT-xxx` / `ST-xxx` の ID で管理する
- 設計書の各項目には、それが実現する **FR-ID を必ず併記**する
- `docs/` 配下の文書は frontmatter に `doc_id` / `status`(draft / review / fixed) / `updated` を持つ

### 技術スタック
- フロント: Vue 3 + Vite + TypeScript + Pinia
- バック: Java 25 + Spring Boot 4.x + Maven(マルチモジュール)
- DB: PostgreSQL 16 + Flyway
- デプロイ: Render(予定)

### ロジック層の制約
- `backend/typing-core/` は**言語非依存の純粋ロジック**。Spring / JDBC / HTTP / ファイル IO を import しない
- ロジック仕様は `docs/30_detail-design/logic-spec/` に**言語名を出さない疑似コード**で書く
- 実装の正しさは `shared/testdata/` の共有テストベクタで検証する(他言語へ移植可能にするため)

### git push 前の確認
- `git push` する前に、pushされる差分に個人情報(メールアドレス・電話番号・PCのユーザー名・本名フルネーム等)が含まれていないか確認する
- 見つかった場合は無断でpushせず、扱い(除外する/伏せ字にする/そのまま許容する等)をKazukiと相談してから進める(2026-08-29追記。本プロジェクトのリポジトリはPublicで運用するため)

### 学習目的
本プロジェクトは Claude Code の機能(commands / agents / skills / rules / hooks)を工程の進行に合わせて整備することも目的とする。**その工程で実際に困ったことだけを解決する**形で導入し、機能のために工程を歪めない。
