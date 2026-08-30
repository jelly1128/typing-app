---
doc_id: TST-001
status: fixed
updated: 2026-08-30
---

# テスト計画

P4(テスト設計)の起点となる文書。テストレベルの定義・ID体系・テスト環境方針を確定し、`ut-cases.md`/`it-cases.md`/`st-cases.md`/`traceability-matrix.md`(P4-03〜06)がこれに従って書けるようにする。

**P4完了(2026-08-30、Kazuki確認済み)。**

## 1. 目的・完了条件

**目的:** 実装(P5)前にテストケースを固め、設計の抜けを炙り出す(`workflow.md`)。
**完了条件:** 全FR-ID(FR-01〜13)にテストケースIDが1件以上紐づいた状態(`traceability-matrix.md`で確認する)。

## 2. テストレベル定義

3レベルに分ける。**対象が「DB/HTTPを必要とするか」で UT と IT を分け、「画面操作を含むか」で IT と ST を分ける。**

| レベル | 対象 | 前提条件 | 実行時期(目安) |
|---|---|---|---|
| **UT(単体)** | 単一クラス・関数の入出力検証。DB・HTTP不要 | なし(純粋な関数呼び出し) | P5実装と並行(TDD)。`typing-core`はKazuki自身がTDDで書く方針(`progress.md`参照) |
| **IT(結合)** | 複数コンポーネントの結合。DB実体が必要 | PostgreSQLコンテナ起動(`docker compose up`) | P5後半(APIレイヤ実装後)〜P6 |
| **ST(総合)** | 画面操作を含むシナリオ。ブラウザ経由のエンドツーエンド | フロント・バックエンド両方起動 | P6 |

### 2.1 UT(単体テスト)の対象

| 対象 | テストフレームワーク | 備考 |
|---|---|---|
| `typing-core`(`SessionMetricsCalculator`/`AdviceGenerator`) | JUnit5 | `shared/testdata`のケースをそのまま入力する(3章) |
| `judgment-engine`(`moraJudge.ts`/`sequenceJudge.ts`) | Vitest | 同上。`sequenceJudge`はキー入力の逐次呼び出しをシミュレートする |
| `api`の`Service`層 | JUnit5 + Mockito | `Repository`をモック化し、存在確認・値域チェック・自己ベスト判定などのロジックのみを検証する。メソッドシグネチャは`class-design.md`1.4参照(test-B1対応、2026-08-30) |

### 2.2 IT(結合テスト)の対象

| 対象 | 備考 |
|---|---|
| `Repository`層のクエリ(FR-08/09/10の集計クエリ) | 実PostgreSQL(Testcontainers等)で検証する。モックでは`db-access.md`のJPQL/ネイティブクエリの正しさを検証できないため(test-B7対応) |
| `Controller→Service→Repository→DB`のAPIエンドツーエンド | 各エンドポイントの正常系・4xx・404を実DBで検証 |
| NFR-09(DB障害時の挙動) | 障害注入手段は**Testcontainersのコンテナ停止**で代替する(DB接続断をシミュレートする最も単純な方法。ネットワーク分断等の高度な注入は個人開発規模では過剰と判断。test-B3対応、2026-08-30) |

### 2.3 ST(総合テスト)の対象

| 対象 | 備考 |
|---|---|
| UC-01〜07の主要シナリオ(名前入力→お題選択→タイピング→結果→履歴→自己ベスト→ミス分析) | ブラウザ経由(Playwright等、P4-02またはP5で選定) |
| NFR-01(入力反応性50ms以内) | **計測ポイント**: `keydown`イベント発火時刻 〜 `TypingDisplay.vue`のDOM更新完了時刻の差分。ブラウザ開発者ツールのPerformanceタブ、またはE2Eテスト内で`performance.now()`を前後に挿入して計測する(test-B2対応、2026-08-30) |
| NFR-02(画面表示速度2秒以内) | **計測ポイント**: 画面遷移トリガ(ボタンクリック等)〜対象データがDOMに描画完了するまでの時間。同上の方法で計測 |
| test-C3/ops-C3(自己ベストが終了条件をまたぐケース) | 「今回のセッションが自己ベストを更新した直後に、その値を`SessionResult.previousBest`ではなく`isNetKpmBest`/`isAccuracyBest`で正しく示せているか」をシナリオとして1件追加する |

NFR-01/02は個人学習用途のため厳密な性能試験ではなく「体感確認+簡易計測ログでの目安確認」にとどめる(`requirements.md`NFR-02備考と整合)。

## 3. `shared/testdata` の形式(test-C1対応)

`romaji-automaton.md`/`session-metrics.md`/`advice-generation.md`の3本がP4冒頭で確定するよう申し送っていた事項。

**形式: JSON。1機能につき1ファイル、配置は `shared/testdata/<area>/cases.json`。**

理由: CLAUDE.mdの制約(ロジック層は言語非依存)により、JSON/TypeScript双方の言語から読み込める必要がある。JSONはTS・Javaどちらも標準ライブラリで扱え、YAMLやCSVより構造化データ(ネストしたオブジェクト・配列)を表現しやすい。

```
shared/testdata/
  romaji-automaton/cases.json
  session-metrics/cases.json
  advice-generation/cases.json
```

**共通スキーマ:** 各ファイルはケースオブジェクトの配列。

```json
[
  { "id": "...", "description": "...", "input": { ... }, "expected": { ... } }
]
```

- `id`: `<area略号>-<3桁連番>`(例: `RA-001`, `SM-001`, `AG-001`)。UT-xxx(テストケースID)とは別の採番系列(testdataは入出力ペアの識別子、UTはテストケース自体の識別子。1つのtestdataケースを複数のUTから参照することがあるため分離する)
- `description`: 何を検証するケースか(日本語可)
- `input`/`expected`: 領域ごとに以下のとおり

### 3.1 `romaji-automaton`(`sequenceJudge`のキー入力逐次呼び出し)

```json
{
  "id": "RA-001",
  "description": "「し」をshiで確定する",
  "input": {
    "moraList": ["し"],
    "keystrokes": ["s", "h", "i"]
  },
  "expected": {
    "steps": [
      { "confirmedText": "", "pendingInput": "s", "nextHint": "hi", "missAt": null, "currentKana": "し", "moraIndex": 0, "confirmedMora": null, "miss": null },
      { "confirmedText": "", "pendingInput": "sh", "nextHint": "i", "missAt": null, "currentKana": "し", "moraIndex": 0, "confirmedMora": null, "miss": null },
      { "confirmedText": "し", "pendingInput": "", "nextHint": null, "missAt": null, "currentKana": "し", "moraIndex": 1, "confirmedMora": {"kana": "し", "charType": "清音", "acceptedPattern": "shi", "moraIndex": 0}, "miss": null }
    ]
  }
}
```

`steps`は`keystrokes`と同じ長さ。各要素は`class-design.md`2.2の`KeystrokeResult`8フィールドをすべて含む(逐次呼び出しの決定性を他言語でも検証できるようにするため、部分一致ではなく完全一致で比較する)。ミスを含むケースは該当ステップで`missAt`/`miss`を埋める。

### 3.2 `session-metrics`(`SessionMetricsCalculator`の単発呼び出し)

```json
{
  "id": "SM-001",
  "description": "通常ケース: KPM・正確率が数式どおり",
  "input": { "correctKeyCount": 100, "missRecordCount": 5, "keystrokeIntervalsMs": [200, 210, 190], "durationSeconds": 60 },
  "expected": { "netKpm": 100.0, "rawKpm": 105.0, "accuracy": 95.24, "consistency": 8.16, "durationSeconds": 60 }
}
```

### 3.3 `advice-generation`(`AdviceGenerator`の単発呼び出し)

```json
{
  "id": "AG-001",
  "description": "誤りパターン1件のみ該当",
  "input": { "byKana": [], "byErrorPattern": [{"expectedKey": "s,c", "actualKey": "t", "count": 10}], "byCharType": [] },
  "expected": { "advice": ["「s,c」と入力すべきところを「t」と間違えることが多いようです。..."] }
}
```

`expected.advice`は文言の完全一致ではなく、`advice-generation.md`3章テンプレートへの当てはめ結果(具体的な文字列)を期待値とする。テンプレート文言自体を変更した場合はtestdataも合わせて更新する。

**testdata本体(JSON)の作成タイミング(2026-08-30、Kazukiと合意):** 上記はスキーマ(形式)の決定であり、`shared/testdata/`配下の実ファイルはP4時点では作らない。手で(コードを実行せずに)`sequenceJudge`のような状態機械の期待値を計算すると誤りが混入しやすいため、**P5で`typing-core`をKazuki自身がTDDで実装する際、テストを書きながら一緒にtestdataを埋める方針とする**(`progress.md`のP5方針と同じ理由。テスト駆動サイクルにそのまま乗せることで手戻りも減る)。

## 4. ID体系(テストケースID)

`CLAUDE.md`の規約どおり `UT-xxx` / `IT-xxx` / `ST-xxx`(3桁連番)。

| 項目 | 規則 |
|---|---|
| 採番単位 | レベルごとに通し番号(UT-001, UT-002, ... / IT-001, ... / ST-001, ...)。クラス・機能ごとの枝番は付けない(採番の単純さを優先。対象クラス・メソッドは各ケースの列として記録する) |
| 記載場所 | `ut-cases.md`/`it-cases.md`/`st-cases.md`(P4-03〜05で作成)。列: ID / 対象(クラス.メソッド or 画面/API) / 概要 / 前提条件 / 期待結果 / 対応FR-ID / 対応testdata ID(UTのみ) |
| FR-IDとの対応 | 1テストケースが複数FR-IDにまたがってよい(例: `submitSession`は FR-04〜09 にまたがる)。`traceability-matrix.md`(P4-06)で全FR-IDへの充足を確認する |

## 5. テスト環境方針

| 項目 | 方針 |
|---|---|
| UT実行環境 | ローカル(CI無し、個人開発のため`mvn test`/`npm run test`を手動実行) |
| IT実行環境 | ローカルDocker(`docker compose up`のPostgreSQLコンテナ、またはTestcontainers) |
| ST実行環境 | ローカル起動(フロント`npm run dev`+バックエンド`mvn spring-boot:run`)、または本番URL(Render)への軽い疎通確認 |
| データ準備 | IT/STはP3-06で確定したFlywayリポータブルマイグレーション(`db-access.md`7章)のシードデータを使う。テスト専用データは各テストのセットアップで個別投入する |

## 6. 未決事項

- E2Eフレームワーク(Playwright等)の選定はP5着手時に行う(2026-08-30訂正。当初`testcase-gen` skillで決める想定だったが、同skillはテストケースの下書き支援に留まりツール選定は対象外と判明したため)。本文書ではSTの実行環境のみ方針化する
