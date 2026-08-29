---
paths:
  - "frontend/src/judgment-engine/**"
---

# judgment-engine の制約

`frontend/src/judgment-engine` はローマ字判定エンジン(`docs/30_detail-design/logic-spec/romaji-automaton.md` の実装、FR-02/03/04)。

- Vue(コンポーネント・Pinia)に依存しない。`import`してよいのはTypeScript標準ライブラリのみ
- 判定結果(`KeystrokeResult`)を返すだけで、DOM操作・状態管理は行わない(呼び出し元の `TypingView.vue` / `sessionStore` が担う。`docs/30_detail-design/class-design.md` 2.2/2.4節)
- 将来 P9 で Java(`backend/typing-core`)へ移植する対象になるため、`shared/testdata` の入出力パターンだけでテストできる形を保つ
