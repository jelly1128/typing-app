---
doc_id: TST-007
status: draft
updated: 2026-09-12
---

# バグ一覧

P6(テスト実施)で発見したアプリケーション本体のバグを記録する。テストコード側の不具合(テストの書き方の誤り)はここに起票せず、`test-results.md`に発見・修正の経緯のみ記載する。

## 集計

| 件数 | 内訳 |
|---|---|
| 起票数 | 2 |
| 解決済み | 1 |
| 残課題(明記のうえ対応見送り) | 1 |
| 未解決 | 0 |

P6-02(UT/IT全件再実行)・P6-03〜05(ST-001〜015)を通じては、アプリケーション本体の不具合は0件だった。実施中に見つかった問題のうち、以下はバグとして起票していない。

- テストコード側の不具合(テストの前提・データ投入方法の誤り。`test-results.md`のP6-03節参照)
- 設計はされていたが未実装だった項目(`sequence.md`5.2の共通404ハンドラ。P6-04着手時に発見し、その場で実装。`test-results.md`のP6-04節・CL-028参照)
- 仕様どおりの挙動をKazukiが誤入力と勘違いしたケース(P5-19、「ほんや」を`honya`と入力した件。`specialMora.ts`の`nReceptionPatterns`どおりの仕様)

P6-07(まとめ・完了確認)着手時、CL-028実装(P6-04)が一度もコードレビューされていなかったため`/code-review`(medium/high並列)を実施し、以下2件を新規に起票した。

## 一覧

| ID | 概要 | 深刻度 | 状態 | 対応 |
|---|---|---|---|---|
| BUG-001 | `sessionStore.submit()`(S-04 ResultViewの送信・再送)がuserId失効(404 USER_NOT_FOUND)を検知しても`handleUserNotFound`を呼ばず、「結果の保存に失敗しました/もう一度送信」を無限に繰り返す。`sequence.md`5.2の対象ViewにはS-04も明記されていたが、CL-028実装時にAPI呼び出し元(Viewから直接 or ストア経由)のパターン違いにより対応が漏れていた | 高(FR-06の結果保存導線が復旧不能になる) | 解決済み | `sessionStore.submit()`/`endSession()`が`router`を受け取り内部で`handleUserNotFound`を呼ぶよう変更(CL-029)。単体テスト2件追加(`sessionStore.test.ts`/`ResultView.test.ts`)、ST-001〜013再実行(13件PASS)で退行なしを確認 |
| BUG-002 | `HistoryView`で`loadPersonalBest`と`listSessionHistory`が同時に404(USER_NOT_FOUND)を検知すると`handleUserNotFound`が2回呼ばれる | 低 | 残課題として明記(対応見送り) | 実機検証の結果、vue-router 5では同一ルートへの重複`push`は例外を投げず`NavigationFailure`として解決されるのみ(未処理のPromise rejection等の実害なし)と確認できたため、コード修正は見送り。`useUserStore().clearUser()`が2回呼ばれる点も冪等なため実害なし |
