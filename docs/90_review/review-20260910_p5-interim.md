---
doc_id: REV-014
status: fixed
updated: 2026-09-11
---

# レビュー(2026-09-10、P5中間・コードレビュー)

対象: `/code-review`(medium/high並列)。差分は `origin/main`(`b0ad982`、P5-14完了時点)との比較、実質的にP5-15〜17(`38e3704`〜`fcd44ff`、`TypingView`/`ResultView`/`HistoryView`/`MissAnalysisView`等frontend views一式)。

位置づけ: P5中間レビュー(ゲート無し)。

**2026-09-11対応済み:** A1・B1・B2・B3を対応(下記各項目参照。CL-023/CL-024)。C1は前回セッション終了時に対応済み。C2(`restoreFromStorage`未呼び出し)はP5-18(router整備)のスコープとして申し送りのまま残す。C3(効率・簡潔さの指摘)は対応不要のまま。加えて、本レビューで対象外だったP5-09〜17範囲の追加`/code-review`を実施し、CL-025で対応した(本ファイル末尾に追記)。

参照した既存の合意事項: `docs/30_detail-design/class-design.md` 2.2/2.4、`docs/30_detail-design/logic-spec/romaji-automaton.md` 6章・7.1、`docs/30_detail-design/logic-spec/romaji-automaton.md`「既知の制限」(2026-09-07合意済み)

---

## 重要度A(次回セッション冒頭で対応推奨)

### A1. お題文の境目で`kanaOccurrenceNo`が誤って採番される【対応済み、2026-09-11】

**対応:** `sessionStore.startNewSentence()`を追加し`TypingView.beginSentence()`から呼ぶ方式で解決(CL-023)。再現テストを`sessionStore.test.ts`に追加、Green確認済み。

- 対象ファイル・箇所: `frontend/src/stores/sessionStore.ts` `recordKeystroke`(84-89行目)、`frontend/src/judgment-engine/sequenceJudge.ts`(`cumulativeMoraIndex`の更新箇所)
- 指摘内容:
  - `sessionStore.recordKeystroke`は`result.moraIndex !== this.lastMoraIndex`を「新しい拍の判定が始まった」の判定に使い、変化を検知した時だけ`kanaOccurrenceNo`を採番し直す(`class-design.md` 2.2「`moraIndex`…この値が直前の`KeystrokeResult`から変化したら、新しい拍の判定が始まったことを表す」に基づく設計)。
  - `sequenceJudge.ts`の`cumulativeMoraIndex`は**拍が確定した時にしか増えない**。あるお題文の最後の拍が確定した直後の`moraIndex`(=次に来るはずの拍の番号)と、次のお題文の最初の拍がまだ未確定のまま判定中の間の`moraIndex`は**同じ数値**になる。
  - 結果、**複数文のセッションで、2文目以降の最初の1文字目をミスするたび**に、`sessionStore`は「moraIndexが変化していない」と誤認して採番をスキップし、ミス記録に**前のお題文の最後の拍のoccurrence番号を使い回して**しまう。トレースして確認済み(下記の具体例参照)。
  - 影響範囲: FR-10(ミス分析、`byKana`)の集計データが壊れる。バックエンドの`db-access.md` 4章の集計クエリが`DISTINCT ON (session_id, kana, kana_occurrence_no)`で重複排除する設計のため、番号が衝突した2件のミスのうち1件が消える可能性もある。
- 具体例(お題文A「あ」1文字、お題文B「あ」1文字、Bの1文字目をミスする場合):
  1. Aの「あ」を`a`で確定 → `cumulativeMoraIndex`が0→1に。この確定の`KeystrokeResult.moraIndex=1`が`recordKeystroke`に渡り、`lastMoraIndex`が`null`→`1`に更新、「あ」のoccurrenceNo=1が採番される。
  2. `startSentence`でBが始まる(`cumulativeMoraIndex`は1のまま変化しない)。
  3. Bの「あ」に`x`(誤入力)→ミス。`buildResult`が返す`KeystrokeResult.moraIndex`も**まだ1**(この拍はまだ確定していないため)。
  4. `recordKeystroke`は`1 === lastMoraIndex(1)`のため採番処理をスキップし、ミス記録には**古い`currentOccurrenceNo=1`(Aの「あ」のもの)がそのまま使われる**。本来はBの「あ」のoccurrence 2番目として新規採番されるべき。
- 推奨対応(未実施、要検討): `startSentence`が新しいお題文を始めたことを`sessionStore`に明示的に伝える手段が必要。候補: `sessionStore`に`startNewSentence()`アクションを追加し`this.lastMoraIndex = null`にリセットする(次の本物のキー入力で必ず採番し直させる)方式が最も影響範囲が小さそう。`TypingView.beginSentence()`から呼ぶ。設計変更を伴うため、着手前に`class-design.md` 2.2/`romaji-automaton.md` 7.1の採番規則を先に修正すること(CL-022と同型の手順)。

---

## 重要度B(できれば次回セッションで対応)

### B1. 1キーで2拍同時確定する既知の制限が、`TypingView`側でセッション凍結+例外という新しい実害を生む【対応済み、2026-09-11】

**対応:** `sequenceJudge`に`isSentenceComplete(): boolean`を追加し、`TypingView`はこれを呼ぶ方式に変更(CL-024)。「ん」+「ー」の既知の制限ケースを`sequenceJudge.test.ts`で再現し、凍結しないことを確認済み。

- 対象ファイル・箇所: `frontend/src/views/TypingView.vue`(`confirmedMoraCountInSentence`、36・48-53・88-103行目)、`frontend/src/judgment-engine/sequenceJudge.ts:172`
- 指摘内容: `romaji-automaton.md`の「既知の制限」(2026-09-07合意、対応不要と確定済み)により、1回のキー入力で2拍が同時に確定する場合`KeystrokeResult.confirmedMora`は1件しか通知されない。`TypingView`はお題文完了を`confirmedMora !== null`の発生回数を数える自前カウンタで判定しているため、この制限に該当するキー入力が発生すると**カウントが1つ足りなくなり、`advance()`が呼ばれずお題文が終わらない**。次のキー入力で`sequenceJudge.handleKeystroke`が`拍列の判定が既に終了しています`という例外を投げ、未捕捉のままセッションが固まる。
  - 発生条件は「ん」の直後に「ー」が続く場合のみ(2026-09-07の合意どおり実在データでは起こりにくいとされている)ため優先度は中程度。
- 推奨対応(未実施): `TypingView`が自前でカウントする代わりに、`sequenceJudge`側にお題文完了を直接問い合わせる手段(例: `isSentenceComplete()`、または`KeystrokeResult`に`isSentenceComplete: boolean`を追加)を用意し、エンジンが持つ`indexInSequence`を正とする形に直す。

### B2. `HistoryView`: 自己ベスト取得が一度失敗すると`<select>`ごと消えて復旧できない【対応済み、2026-09-11】

**対応:** `<select>`はエラー時も表示したままにし、エラーメッセージ+再試行ボタンをその下に出す形にレイアウトを変更。テスト追加、Green確認済み。

- 対象ファイル・箇所: `frontend/src/views/HistoryView.vue`(72-83行目)
- 指摘内容: `personalBestError`が`true`になると、エラーメッセージを含む`v-if`分岐に切り替わり、`v-else`側にある難易度選択`<select>`ごと非表示になる。ページ再読み込みでしか復旧できない。
- 推奨対応(未実施): `<select>`はエラー時も表示したままにし、エラーメッセージ+再試行導線だけをその下に出す形にレイアウトを直す。

### B3. `HistoryView`: 難易度を素早く切り替えると古いレスポンスが新しいレスポンスを上書きする【対応済み、2026-09-11】

**対応:** リクエストIDを保持し、レスポンス受信時に最新のリクエストのものだけを反映する方式で解決。競合状態を再現するテストを追加、Green確認済み。

- 対象ファイル・箇所: `frontend/src/views/HistoryView.vue`(`watch(selectedTopicSetId, ...)`、41-43行目)
- 指摘内容: 難易度Aを選択(レスポンス遅め)→即座に難易度Bに選び直す(レスポンス速め)、という操作をすると、Bの結果が先に表示された後にAの結果で上書きされてしまう競合状態(race condition)がある。
- 推奨対応(未実施): リクエスト発行時の`topicSetId`を保持し、レスポンス受信時に現在選択中の`topicSetId`と一致する場合のみ反映する、またはAbortControllerで前のリクエストを打ち切る。

---

## 重要度C(余裕があれば)

### C1. `estimate-actual.md`のfrontmatter `updated`が更新されていない

- 対象ファイル・箇所: `docs/00_project/estimate-actual.md` 4行目(`updated: 2026-09-07`のまま)
- 指摘内容: 同じ差分の中で2026-09-10付けの行(P5-15〜17)を追記しているのに、frontmatterの`updated`が古いまま。CLAUDE.mdの「`docs/`配下の文書はfrontmatterに`updated`を持つ」規約との軽微な不整合。
- **対応済み(2026-09-10、`/ty-end`時に修正)**: `updated: 2026-09-10`に更新した。

### C2(申し送り). `userStore.restoreFromStorage()`がどこからも呼ばれていない

- 対象ファイル・箇所: `frontend/src/stores/userStore.ts`(`restoreFromStorage`)
- 指摘内容: `screen-design.md` 2章の「起動時にlocalStorageを読み出し、値があればS-02から始まる」という仕様の実装先が、この`restoreFromStorage()`のはずだが、**自身のテスト以外どこからも呼ばれていない**。現状`userStore.userId`はリロード後・直接URLアクセス時に常に`null`になる。
- 位置づけ: これは**P5-18(router整備)の完了条件そのもの**(起動時ガード)なので新規の指摘というよりP5-18のスコープ確認。`TypingView.vue:125`の`userStore.userId!`の非null断定や、`HistoryView`/`MissAnalysisView`が`userId===null`時に何も表示せず沈黙する点(NFR-09の汎用エラー表示と不整合)も、P5-18でこのガードを実装すれば実質的に解消される。**P5-18着手時に「起動時のrestoreFromStorage呼び出し」を完了条件のチェックリストに明示的に含めること。**

### C3(参考、対応不要). 効率・簡潔さの指摘

`/code-review`のsimplification/efficiency/reuse角度から、以下のような指摘も出ている。MVPの規模では許容範囲と判断し、対応は見送ってよい(気になる場合のみ):

- `HistoryView.vue`のonMounted内で`topicStore.loadTopicSets()`と`listSessionHistory()`を直列awaitしている(依存が無いのでPromise.allで並列化できる)
- `TypingView.vue`のtime_limitタイマーが200ms間隔だが表示更新は1秒に1回で十分(`setInterval`の呼び出し回数が過剰)
- 4画面(`HistoryView`/`MissAnalysisView`/`TypingView`/`HomeView`)で「fetch→エラーフラグ→`role="alert"`表示」という定型処理が独立に重複しており、共通コンポーザブル化の余地がある
- エラー文言`'読み込みに失敗しました'`が5箇所にハードコードされている

---

## 未実施範囲の申し送り(重要)

**P5-09〜P5-14(backend `SessionController`〜frontend `stores`まで)は、P5-08完了時点の中間レビュー(2026-09-07、`/code-review`)以降、一度も`/code-review`にかけられていない。** 今回のレビューは`origin/main`との差分(=まだpushしていない範囲)を対象にしたため、既にpushされていたP5-09〜14はスコープに入らなかった(pushしたかどうかとレビュー済みかどうかは別軸、というのが今回セッションでの気づき)。

- P5-08完了時点のコミット: `4ff2106`
- 今回レビューの起点(P5-09開始時点): `ecc3770`
- 次回、`/code-review`を`ecc3770`(の親)〜`fcd44ff`の範囲(P5-09〜17、backend残り+frontend全部)を対象に実行することを推奨する。特にA1(本票)の根本原因である`sessionStore.ts`(P5-13)は今回`/code-review`で初めて触れられたが、それはP5-15が`sequenceJudge.startSentence`を複数回呼ぶコードを追加したことで初めて実害のあるパスになったため見つかったものであり、**P5-09〜14自体に埋もれている別の指摘は今回のレビューでは検出できていない可能性がある**。

## 次回セッションでの進め方(提案)

1. ~~A1(occurrenceNo誤採番)を最優先で対応。~~ 対応済み(2026-09-11、CL-023)。
2. ~~B1〜B3を時間の許す範囲で対応。~~ 対応済み(2026-09-11、CL-024・HistoryView修正)。
3. ~~上記「未実施範囲の申し送り」のとおり、P5-09〜14を対象にした`/code-review`を追加で実行するかをKazukiと相談。~~ 実行済み(2026-09-11、下記「P5-09〜17追加コードレビュー」参照)。
4. ~~対応が終わったらこの文書の`status`を`fixed`に更新し、`docs/_index.md`の該当行も更新する。~~ 対応済み。

---

## P5-09〜17追加コードレビュー(2026-09-11、`/code-review high 4ff2106..fcd44ff`)

上記「未実施範囲の申し送り」を受け、P5-08完了(`4ff2106`)〜P5-17完了(`fcd44ff`)の全範囲を対象に追加実行した。

**重複検出(このレビュー時点で既にA1/B1/B2/B3として対応済み):** `TypingView`のconfirmedMoraカウント漏れ(B1)、`sessionStore`のkanaOccurrenceNo採番漏れ(A1)、`HistoryView`の`<select>`非表示(B2)、`HistoryView`の競合状態(B3)。同一バグを異なる起点(`origin/main`比較 vs 明示的なコミット範囲)から検出できたことは、対応の正しさの傍証になる。

**新規検出・対応済み(CL-025):**
- `SessionController`の`GET /api/users/{userId}/best`が`topicSetId`未指定時に500(`MissingServletRequestParameterException`が未捕捉)を返していた。`GlobalExceptionHandler`にハンドラを追加し400に修正(`GlobalExceptionHandlerTest`にテスト追加)
- `db-access.md`/`sequence.md`が`SessionRepository`の旧メソッド名(`findByUserIdOrderByPlayedAtDesc`)のままで、P5-09実装時の変更(`findSummariesByUserIdOrderByPlayedAtDesc`、N+1回避のJOINプロジェクション)に追従していなかった。両文書を実装に合わせて修正
- `class-design.md`の例外→応答対応表が`MethodArgumentNotValidException`(2026-09-07に到達不能として削除済み)のまま、かつ同時に追加された`MethodArgumentTypeMismatchException`が未掲載だった。対応表を実装に合わせて修正

**新規検出・対応見送り(C、低優先度):**
- `MissAnalysisService.buildByCharType`の`CharType.valueOf(m.getCharType())`が無防備(DB値が不正ならIllegalArgumentException→500)。TBL-06の`char_type`にはCHECK制約(CL-021)があり、DB境界で既に値が保証されているため、Java側での再検証は本プロジェクトの「内部の保証を信頼する」方針(CLAUDE.md)に照らして不要と判断
- `SessionService`が`typing-core`の`SessionMetricsCalculator.round()`と同じ丸め処理をもう一度呼んでおり、二重丸めルールの単一情報源という`round()`側のコメントの前提と矛盾する冗長コード。実害は無いため見送り(将来`round()`の丸め方式を変える際は両方直す必要がある点に注意)
- `HomeView.vue`(終了条件の値域チェック)と`SessionService`(同じ値域チェック)が、両方とも今回のP5-09〜14で独立にハードコードされている。クライアント/サーバーで範囲がずれた場合に検知しにくいが、P5-12(baseURL固定・ops-B4)と同様「`api-spec.yaml`との1:1対応を優先し定数化しない」既存方針と同型のため、今回は追加対応せず既存方針を踏襲
