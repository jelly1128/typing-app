---
doc_id: DD-005
status: fixed
updated: 2026-08-29
---

# セッション集計計算仕様

対応 FR: FR-06(セッション結果を算出する)

言語非依存の疑似コードで記述する。入力は `api-spec.yaml` の `POST /api/sessions` リクエスト相当(正誤ログ)、出力は `table-definition.md` TBL-04 の保存項目に対応する。

---

## 1. 入力データ

```
構造体 セッション入力(SessionMetricsInput):
    correctKeyCount          // 正しく確定したキー入力の総数
    missRecordCount          // ミス記録の件数(FR-04)。1ミス = 1件。class-design.md 1.3の設計判断により、
                              // ミス記録の中身(kana/expectedKey等)ではなく件数のみを受け取る
    keystrokeIntervalsMs     // 全キー入力(正誤問わず)の間隔[ms]の配列。Consistency算出専用。保存しない(api-spec.yaml参照)
    durationSeconds          // セッション所要時間[秒]
```

**2026-08-29改訂(ゲート③ doc-reviewer A3対応):** 当初は `SessionInput`/`missRecords`(配列)としていたが、`class-design.md` 1.3 の `SessionMetricsInput` は `missRecordCount`(int)のみを受け取る設計であり、型名・フィールドの両方が不一致だった。本仕様側を `class-design.md` に合わせて修正した。

---

## 2. 算出項目と数式

### 2.1 総キー入力数

```
総キー入力数 = correctKeyCount + missRecordCount
```

requirements.md の決定事項どおり、同じ拍で複数回ミスした場合はその回数分すべて `missRecords` に含まれるため、そのまま加算するだけでよい。

### 2.2 Net KPM(正しい確定打鍵のみ基準)

```
もし durationSeconds == 0:
    netKpm = 0   // 4章「設計判断メモ」判断#3参照
それ以外:
    netKpm = correctKeyCount ÷ (durationSeconds ÷ 60)
```

### 2.3 Raw KPM(ミス含む総打鍵基準)

```
もし durationSeconds == 0:
    rawKpm = 0
それ以外:
    rawKpm = 総キー入力数 ÷ (durationSeconds ÷ 60)
```

### 2.4 正確率

```
もし 総キー入力数 == 0:
    accuracy = 0   // 4章 判断#3参照。「データなし」を最良値(100)にしない
それ以外:
    accuracy = (correctKeyCount ÷ 総キー入力数) × 100
```

`table-definition.md` TBL-04 `accuracy NUMERIC(5,2)` に合わせ、保存前に小数第2位で丸める。

### 2.5 Consistency(打鍵間隔のばらつき)

**設計判断:** 統計量は**標準偏差(ms)**を採用する(却下案: 変動係数)。

```
もし keystrokeIntervalsMs の要素数 < 2:
    consistency = 0   // ばらつきを計算できるだけのデータがない
それ以外:
    平均 = keystrokeIntervalsMs の平均値
    分散 = Σ (各要素 - 平均)^2 ÷ 要素数        // 母標準偏差(N で割る)
    consistency = √分散
```

`table-definition.md` TBL-04 `consistency NUMERIC(8,2)` は ms 単位の標準偏差を保存する前提で桁数が確保されており、変更不要と確認した。

---

## 3. 出力

```
構造体 セッション結果(SessionMetricsResult):
    netKpm        // 2.2、小数第2位で丸め
    rawKpm        // 2.3、小数第2位で丸め
    accuracy      // 2.4、小数第2位で丸め
    consistency   // 2.5、小数第2位で丸め
    durationSeconds
```

`table-definition.md` TBL-04 への保存、および `api-spec.yaml` のレスポンス(`isNetKpmBest` / `isAccuracyBest` 判定用の比較元データ)はこの構造体を経由する。

**丸め・桁あふれの扱い(2026-08-29、ゲート③ test-reviewer A7対応で確定):**

- 丸めモードは **HALF_UP**(四捨五入)を採用する。丸めは本構造体を組み立てる出口(`SessionMetricsCalculator`の戻り値を作る時点)で**1回だけ**行い、呼び出し元(`SessionService`)では再度丸めない(二重丸めを避ける)
- `netKpm`/`rawKpm` が `table-definition.md` TBL-04 の桁数上限(`NUMERIC(6,2)`、最大9999.99)を超えた場合、`SessionMetricsCalculator` はそのまま超過した値を返す。上限チェックと400応答への変換は呼び出し元の `SessionService` が行う(`class-design.md` 1.4 値域チェック表を参照。計算自体は失敗させない)

---

## 4. 設計判断メモ

| # | 判断内容 | 却下した代替案 | 理由 |
|---|---|---|---|
| 1 | Consistencyは標準偏差(ms)を採用 | 変動係数(標準偏差÷平均、単位なし) | 変動係数は入力速度で正規化されるため異なる速さのセッション間比較には向くが、本アプリではConsistencyは自己ベスト(FR-09)の比較対象に含まれておらず単一セッション内の参考表示にとどまるため、より直感的な「ばらつきの絶対量[ms]」を採用した。table-definition.md TBL-04の桁数(NUMERIC(8,2))もms単位の値を前提にしている |
| 2 | 母標準偏差(Nで割る)を採用 | 標本標準偏差(N-1で割る) | 打鍵間隔の全数(セッション内の全キー入力)が母集団そのものであり、標本から母集団を推定する状況ではないため |
| 3 | durationSeconds=0または総キー入力数=0の場合は0除算を避けて既定値を返す。既定値は常に「最良ではない側」(KPM=0、正確率=0)にする | 正確率の既定値を100にする(当初案) | 制限時間モードでは1キーも打たずに終了条件(時間経過)を満たしてセッションが保存されうる。正確率の既定値を100にすると、その1回が難易度別自己ベスト(FR-09)として記録され、以後正確な記録が出ても`isAccuracyBest`の「厳密に上回った場合のみtrue」判定により永久に更新できなくなる(2026-08-29、P3中間レビューREV-009 A6対応)。既定値を0にすれば後続の正常なセッションが必ず上回るため、自己ベストを汚染しない |

---

## 5. `shared/testdata` への申し送り

- 通常ケース(correctKeyCount・missRecords・durationSecondsの組み合わせ複数)でNet/Raw KPM・正確率が数式どおりになること
- keystrokeIntervalsMsが0〜1要素の場合にConsistency=0となること
- durationSeconds=0、総キー入力数=0のそれぞれで既定値(4章 判断#3参照)が返ること
- 丸めモードがHALF_UPであること(境界値: 33.335→33.34等)

具体的なテストベクタ一覧はP4(テスト設計)で作成する。
