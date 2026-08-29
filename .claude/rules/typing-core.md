---
paths:
  - "backend/typing-core/**"
---

# typing-core の制約

`backend/typing-core` は言語非依存の純粋ロジックモジュール(CLAUDE.md)。

- Spring / JDBC / HTTP / ファイルIO を import しない
- P9(多言語移植)での TypeScript 版との突き合わせ対象になるため、`shared/testdata` の入出力パターンだけでテストできる形を保つ(DB・HTTPのモックを必要とする実装にしない)
- クラス構成は `docs/30_detail-design/class-design.md` 1.3節を参照
