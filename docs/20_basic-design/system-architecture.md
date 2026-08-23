---
doc_id: BD-001
status: draft
updated: 2026-08-23
---

# システム構成(基本設計)

## 1. 全体構成図

```
┌─────────────────────────────┐        ┌──────────────────────────────┐        ┌────────────────────┐
│  ブラウザ                     │        │  Render (Web Service)         │        │  Render             │
│  Vue 3 + Vite + TS + Pinia   │  HTTPS │  Java 25 + Spring Boot 4      │  JDBC  │  Managed PostgreSQL │
│                               │───────▶│  (Maven マルチモジュール)       │───────▶│  16                 │
│  - 画面表示・状態管理           │        │  - typing-core(純粋ロジック)   │        │                      │
│  - ローマ字判定(TS実装)        │        │  - api(Controller/Repository) │        │                      │
└─────────────────────────────┘        └──────────────────────────────┘        └────────────────────┘
```

## 2. 最重要決定: リアルタイム判定はフロントエンド完結

NFR-01(入力反応性 50ms 以内)を満たすため、ローマ字入力判定(FR-02)とリアルタイム表示更新(FR-03)は**キー入力ごとにバックエンドへ問い合わせない**。判定ロジックをフロントエンド(TypeScript)に実装し、ブラウザ内で完結させる。

検討経緯と却下案は [ADR-002](../00_project/decisions/002-realtime-judgment-frontend.md) を参照。

### `typing-core`(Java)の役割はP5では集計計算のみ

ローマ字オートマトン(複数表記の受理判定)は、実働するのはフロントエンド(TS)だけである。バックエンドはフロントエンドが確定させた正誤ログを受け取って FR-06 の集計計算(Net/Raw KPM・正確率・Consistency)を行うのみで、オートマトンそのものを Java で再実装する必要は **P5(MVP)時点ではない**。`backend/typing-core` はこの集計計算ロジックのみを持つ。

ローマ字オートマトンの Java 実装(`shared/testdata` を使った TS 版との突き合わせ検証)は **P9(多言語移植・任意)に着手した場合のみ**発生する。その場合、疑似コード仕様(P3 `logic-spec/romaji-automaton.md`)を出典に Java へ**移植**する(実働版である TS が先にあり、Java が後追いの移植になる。workflow.md 参照)。

## 3. レイヤ構成と責務(FR-ID 対応)

| レイヤ | 技術 | 責務 | 対応 FR |
|---|---|---|---|
| フロントエンド | Vue 3 + Vite + TS + Pinia | 画面表示・状態管理・利用者名の入力 | FR-01, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13 |
| フロントエンド | TS(ローマ字判定エンジン) | キー入力ごとの正誤判定・リアルタイム表示更新・ミス記録の一時保持 | FR-02, FR-03, FR-04, FR-05 |
| バックエンド API | Spring Boot Controller | 利用者識別(find-or-create)・お題取得・セッション結果保存・履歴/自己ベスト/ミス分析取得 | FR-01, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13 |
| バックエンド ロジック | typing-core(純粋 Java) | セッション結果の集計計算(Net/Raw KPM・正確率・Consistency) | FR-06 |
| バックエンド 永続化 | Spring Data JPA + Repository | 利用者・お題・セッション結果・ミス記録の読み書き | FR-01, FR-04, FR-07, FR-08, FR-09, FR-10, FR-12, FR-13 |
| DB | PostgreSQL 16 + Flyway | データ永続化・スキーマ管理 | 全 FR の永続化対象 |

## 4. モジュール構成

```
backend/
  typing-core/   … 純粋ロジック。Spring / JDBC / HTTP / ファイルIO を import しない
  api/           … Spring Boot アプリ本体(Controller / Entity / Repository / Service)
frontend/        … 判定エンジン(TS)と画面表示は別モジュールとして分離する
shared/
  testdata/      … typing-core とフロントエンド判定エンジンの共通テストベクタ(P9 で使用)
```

> フロントエンドの具体的なフォルダ構成(`features/` の切り方等)は P3 `class-design.md` で確定する。P2 の完了条件(画面・API・テーブルの整合)には含まれないため、ここでは決めない。

## 5. データフロー

0. **利用者識別(FR-12)**: フロントエンド → `POST /api/users`(名前) → Repository が find-or-create → DB
1. **お題取得(FR-01, FR-13)**: フロントエンド → `GET /api/topics?difficulty=...` → Repository → DB
2. **タイピング中(FR-02〜FR-05)**: フロントエンド内で完結。バックエンド通信なし。ミス記録・打鍵ログはブラウザ内(Pinia store またはローカル変数)に一時保持する
3. **セッション終了(FR-05〜FR-07)**: フロントエンドが一時保持したログをまとめて `POST /api/sessions` に送信 → typing-core が Net/Raw KPM・正確率・Consistency を算出 → Repository が結果とミス記録を1トランザクションで保存(NFR-09)
4. **履歴・自己ベスト・ミス分析(FR-08〜FR-11)**: フロントエンドが対応する GET API を呼び、保存済みデータを取得・表示する

## 6. 非機能要件への対応方針

| NFR | 対応方針 |
|---|---|
| NFR-01 入力反応性 | 2章の判断により、フロントエンド完結型の判定で満たす |
| NFR-02 画面表示速度 | バックエンド呼び出しは画面遷移・セッション終了時のみ。体感2秒以内を目安にする |
| NFR-03 可用性 | Render 無料枠。スリープ・コールドスタートを許容(数値目標なし) |
| NFR-04 通信の保護 | Render のデフォルト HTTPS |
| NFR-05 入力値の保護 | バックエンド: JPA のパラメータバインディング。フロントエンド: Vue テンプレートの自動エスケープ |
| NFR-06 秘匿情報管理 | DB接続情報等は Render の環境変数機能で管理し、ソースコードにハードコードしない |
| NFR-07 ログ | Spring Boot 標準ログ(起動・エラー) |
| NFR-08 バックアップ | Render Managed PostgreSQL の標準バックアップ機能に委ねる |
| NFR-09 DB障害時の挙動 | セッション結果保存は1トランザクションで成功/失敗を確定。失敗時はフロントエンドがエラー画面を表示する |

## 7. 未決事項

- ~~お題取得(FR-01)・履歴取得(FR-08)等の具体的な API パス・リクエスト/レスポンス形式は P2-04で確定する~~ → 解決済み。[`api-spec.yaml`](./api-spec.yaml)(2026-08-23)
- ~~テーブル構造・ミス記録の保存粒度は P2-03で確定する~~ → 解決済み。[`er-diagram.md`](./er-diagram.md) / [`table-definition.md`](./table-definition.md)(2026-08-23)
