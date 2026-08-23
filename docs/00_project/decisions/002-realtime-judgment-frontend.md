---
doc_id: ADR-002
status: fixed
updated: 2026-08-23
---

# ADR-002: リアルタイムのローマ字判定はフロントエンド完結にする

## ステータス

採用

## 背景

P2-01(システム構成図作成)で、FR-02(ローマ字入力判定)・FR-03(リアルタイム表示)をどのレイヤで実行するかを決める必要があった。NFR-01 は「キー入力から画面反映までの遅延 50ms 以内」を要求する。一方 `backend/typing-core` は言語非依存の純粋ロジック(Java)として設計する方針が CLAUDE.md に既に定められている。

## 検討した案

| 案 | 内容 | 見送り理由 |
|---|---|---|
| A. フロントエンド完結 | 判定ロジックを TypeScript でフロントエンドに実装し、キー入力ごとの通信をなくす | (採用) |
| B. サーバー判定 | 1キー入力ごとに API を叩き、Java の `typing-core` で判定する | ネットワーク往復だけで 50ms を超えるリスクが高い。特に Render 無料枠はスリープ・コールドスタート(NFR-03)を許容する方針であり、常時低遅延を前提にできない |
| C. WebAssembly で Java ロジックを共有 | GraalVM 等で `typing-core` を Wasm にコンパイルしブラウザで実行する | ロジックを単一化できる利点はあるが、個人学習用途の規模に対してツールチェーンの学習コスト・ビルド複雑性が過大 |

## 決定

案 A を採用する。ローマ字判定・リアルタイム表示更新はフロントエンド(TypeScript)で完結させる。バックエンドの `typing-core`(Java)は、セッション終了後の集計計算(Net/Raw KPM・正確率・Consistency、FR-06)を担う。

## 影響

- ローマ字オートマトンの実働実装はフロントエンド(TypeScript)の**1箇所のみ**になる。`backend/typing-core`(Java)は FR-06 の集計計算(Net/Raw KPM・正確率・Consistency)のみを持ち、P5(MVP)ではオートマトンを実装しない
- P3 `logic-spec/romaji-automaton.md` はこの TS 実装の出典となる疑似コード仕様として書く
- Java 版オートマトンの実装は **P9(多言語移植・任意)に着手した場合のみ**発生する。その際は TS 版(先に存在する実働版)を Java へ移植し、共有テストベクタ(`shared/testdata/`)で同じ結果になることを検証する。これは workflow.md P9 の記述(「TypeScript 版が Java 版と同じ結果で通す」)と移植の向きが逆になるため、workflow.md 側を修正する(change-log.md CL-001)
- `docs/20_basic-design/system-architecture.md` 2章に反映
