---
doc_id: REV-013
status: fixed
updated: 2026-08-29
---

# レビュー(2026-08-29)

対象:

- `docs/30_detail-design/class-design.md`
- `docs/30_detail-design/sequence.md`
- `docs/30_detail-design/db-access.md`
- `docs/30_detail-design/logic-spec/romaji-automaton.md`
- `docs/30_detail-design/logic-spec/session-metrics.md`
- `docs/30_detail-design/logic-spec/advice-generation.md`

参照した上位文書: `charter.md` / `requirements.md` / `system-architecture.md` / `screen-design.md` / `api-spec.yaml` / `table-definition.md` / `nonfunctional-design.md` / `change-log.md` / `workflow.md`

前提: ゲート③の重要度A 15件の修正直後の検証レビュー。修正の一貫性(古い用語の残存・型名の混在・新規追加規則と既存記述の衝突・修正が生んだ新しい矛盾)を重点的に確認した。

判定サマリ: **P3完了条件「設計書だけを渡したClaudeが実装を書き切れる粒度」は未充足。** 型名統一(`SessionMetricsInput`/`SessionMetricsResult`)、`reading`→`mora_list`への置換、丸めモード、シードデータ方針、404判定の責務、値域チェック表など**多くの修正は6文書に正しく波及している**が、今回の修正で新たに導入された規則(3. `KeystrokeResult`のフィールド定義、4. 動的ヒント、5. `kanaOccurrenceNo`通し番号、2. `sequenceJudge`への状態一元化)が、既存の疑似コード(`romaji-automaton.md` 6章)および `api-spec.yaml`/`table-definition.md` と噛み合っておらず、フロントエンド判定エンジン〜`sessionStore` の境界が実装できない状態になっている。

---

## 重要度A(必須)

### A1. `KeystrokeResult` にミス詳細・拍確定イベントが無く、`sessionStore` が `missRecords[]`/`kanaCounts` を組み立てられない

- 対象ファイル・箇所: `class-design.md` 2.2(`KeystrokeResult`のフィールド定義)、2.4(`sessionStore`の責務)/ `romaji-automaton.md` 7.1
- 指摘内容: 今回追加された `KeystrokeResult` のフィールドは `confirmedText` / `pendingInput` / `nextHint` / `missAt` / `currentKana` の5つのみ。一方 `class-design.md` 2.4 は `sessionStore` の保持状態に `missRecords[]` を挙げ、責務を「`judgment-engine`が返す`KeystrokeResult`を受け取り、7.1の生成規則に従って集計する」と定めている。しかし `SessionSubmission.missRecords[]`(`api-spec.yaml` `MissRecordInput`)が必要とする `expectedKey` / `actualKey` / `prevKana` / `charType` はいずれも `KeystrokeResult` に含まれておらず、判定エンジンから `sessionStore` へ渡る経路が存在しない。`romaji-automaton.md` 6.1 の `ミスを記録する(対象拍, 期待キー候補, 実際キー, 直前拍, 文字種タグ)` はエンジン内部の呼び出しとしてしか書かれておらず、外部へどう出力されるかが未定義。
  同様に `kanaCounts[].totalCount`(7.1「拍が**確定した**回数」)と `correctKeyCount`(7.1「拍が確定するたび採用パターンの文字数を加算」)も、「この打鍵で拍が確定したか」「確定した拍のかな・文字種・採用パターン」を知る必要があるが、`KeystrokeResult` はそれを持たない(`confirmedText` の差分から文字数だけは推測できるが、かな・文字種は取れない)。
  結果として、7.1 で「`sessionStore` の責務」と確定させた5項目のうち `keystrokeIntervalsMs` 以外は実装できない。
- 推奨対応: `KeystrokeResult` に「この打鍵の結果」を表すフィールドを追加して確定させる。最小限、(a) `confirmedMora`(この打鍵で確定した拍: かな・文字種・採用パターン。確定しなければnull)、(b) `miss`(この打鍵で発生したミス: `expectedKey`(カンマ区切り済み文字列)・`actualKey`・`prevKana`・`charType`。なければnull)の2つ。あわせて 2.2 の `types.ts` にある `MissRecord`(judgment-engine側)と `types/api.ts` の `MissRecordInput` の関係(`kanaOccurrenceNo` は `sessionStore` が後付けする)を明記する。

### A2. 画面ヒントの動的選択規則が、同じ段落の例と矛盾している

- 対象ファイル・箇所: `romaji-automaton.md` 6.1末尾「FR-03(リアルタイム表示)との対応」、9章 最終箇条書き / `class-design.md` 2.2 `nextHint`
- 指摘内容: 規則は「`候補集合`の中から**辞書順で先頭**のパターンを選び、`入力済み文字列`の長さ分を除いた残りを表示する」と定義されているが、直後の例は「「し」の候補`{si, shi}`で`s`まで入力済みなら、**先頭パターン`shi`の残り`hi`ではなく`si`の残り`i`を表示する**」となっている。辞書順では `shi` < `si`(2文字目 `h` < `i`)なので、規則どおりに実装すると例と逆の `hi` が表示される。規則と例が真正面から矛盾しており、実装者はどちらにも実装できてしまう。9章の申し送り「「し」で`s`入力後は`i`だけが残候補になること」も例側(短い方優先)を前提にしている。
- 推奨対応: 意図(おそらく「最短のパターンを優先し、同長なら辞書順」)を規則本文に書き直す。どちらを採るにせよ、規則・例・9章の申し送りの3箇所を同時に揃えること。

### A3. `kanaOccurrenceNo`/`kanaCounts` の採番トリガ(`currentKana` の変化)が、同じかなが連続する拍で破綻する

- 対象ファイル・箇所: `romaji-automaton.md` 7.1(`kanaOccurrenceNo` の生成規則)/ `class-design.md` 2.2(`currentKana`)、2.4
- 指摘内容: 採番規則は「**`KeystrokeResult.currentKana` が直前の値から変わったタイミング**でそのかなのカウンタを+1する」と定義された。しかし `mora_list` に同じかなが連続する場合(例:「おおきい」→ `["お","お","き","い"]`、「ここ」→ `["こ","こ"]`)、拍が変わっても `currentKana` は変化しないため、カウンタが加算されない。結果、別々の拍で起きたミスが同じ `(session_id, kana, kana_occurrence_no)` として保存され、`table-definition.md` TBL-05 が保証するはずの「同じ拍への複数ミスをグルーピングするキー」が機能しない。`db-access.md` 4.3 の `DISTINCT ON (session_id, kana, kana_occurrence_no)` が2拍分のミスを1拍に潰すため、FR-10(1)(3)(4) の分子が過小計上される。同じ理屈で `kanaCounts[].totalCount`(確定回数)も1回分少なくなる。
- 推奨対応: 採番トリガを「`currentKana` の変化」ではなく「**拍が確定した/新しい拍の判定が始まったというイベント**」に変える(A1で `KeystrokeResult` に拍確定情報を持たせれば自然に解決する)。判定エンジン側が拍のインデックスを持っているので、`KeystrokeResult` に `moraIndex`(セッション通番でも文内通番でも可)を含めて `sessionStore` が境界を検出できるようにするのが簡単。

### A4. `moraJudge`/`sequenceJudge` の責務分担(`class-design.md` 2.2)と `romaji-automaton.md` 6章の疑似コードが噛み合っていない

- 対象ファイル・箇所: `class-design.md` 2.2(モジュール表・状態保持の分担)/ `romaji-automaton.md` 6.0・6.1、6.1末尾、8章 判断#10
- 指摘内容: 3点の不整合が残っている。
  1. **インターフェースの不一致**: `class-design.md` は `moraJudge.ts` を「同じ引数(**拍・候補集合・入力済み文字列・キー**)には常に同じ結果を返す無状態の関数(`拍を判定する`)」と定義するが、`romaji-automaton.md` 6.1 の `拍を判定する(拍, 次の拍, 事前絞り込み候補, 先頭キー)` は引数が異なるうえ、内部に `候補集合`・`入力済み文字列`・`保留中の確定候補` を保持し「次のキー入力を待つ」ブロッキングループを回す。1キーごとに呼ばれる関数ではない。
  2. **状態の所在の不一致**: 今回の決定は「押し戻し・保留中の確定候補・直前拍を `sequenceJudge` に一元化」だが、6.1 の疑似コードは `保留中の確定候補` を `拍を判定する` の内部に持ったままで、押し戻しキーも `拍を判定する` の戻り値として返している。疑似コード側が決定に合わせて書き換えられていない。
  3. **実装先の記述の矛盾**: 6.1末尾は「この規則の実装先は`class-design.md` 2.2の**`moraJudge.ts`**(`拍を判定する`の戻り値**`KeystrokeResult`**にヒント文字列を含める)」と書くが、`class-design.md` では `KeystrokeResult` を返すのは `sequenceJudge` であり、`moraJudge` は無状態の1拍判定に限定されている。さらに 2.2 の「対応する仕様の章」列は `moraJudge`=6.1、`sequenceJudge`=6.0〜6.1 と 6.1 を二重に割り当てている。
  この状態では、実装者は「イベント駆動(1キー1呼び出し)のフロントエンドで、6章のブロッキングループをどう分割するか」を自分で設計し直すことになり、P3完了条件を満たさない。
- 推奨対応: 6章を「1キー入力ごとに呼ばれる関数」の形に書き直す(例: `sequenceJudge.受理する(キー)` が内部状態〈現在の拍index・候補集合・入力済み文字列・保留中の確定候補・持ち越しキー・直前拍・事前絞り込み候補〉を持ち、`moraJudge.拍を判定する(拍, 候補集合, 入力済み文字列, キー)` は「新候補集合/完全一致か/ミスか」だけを返す純関数とする)。あわせて 6.1末尾の実装先の記述と 2.2 の章対応列を修正する。

### A5. 制限時間モードで1打鍵も無いセッションが 400 で保存できず、`session-metrics.md` 判断#3・FR-05 と矛盾する

- 対象ファイル・箇所: `class-design.md` 1.4 値域チェック表(`durationSeconds` は1未満で400)、2.4 FR-05 終了条件判定の計測定義(計測開始=**最初のキー入力**)/ `session-metrics.md` 2.2〜2.4・4章 判断#3
- 指摘内容: 計測開始が「最初のキー入力(keydown)」と確定したため、制限時間モードで一度も打鍵しなかった場合 `durationSeconds` は 0 になる。一方、今回追加された値域チェック表は `durationSeconds` 1未満を `InvalidSessionSubmissionException`(400)としている。したがってこのセッションは保存できず、S-04 に結果を出せない。しかし `session-metrics.md` 4章 判断#3 は「**制限時間モードでは1キーも打たずに終了条件を満たしてセッションが保存されうる**」ことを明示的な前提として `durationSeconds=0` / 総キー入力数=0 の既定値(0)を定義しており、前提が両立しない。`requirements.md` FR-05(条件成立時に自動的に結果算出へ遷移)・`screen-design.md` S-03→S-04 自動遷移とも整合しない。
- 推奨対応: どちらかに寄せる。(a) 計測開始を「セッション開始時点(S-03表示/カウント開始)」に変え、`durationSeconds` は常に1以上になるようにする(この場合 `session-metrics.md` 判断#3 の「0除算」ケースは総キー入力数=0 のみになる)、または (b) `durationSeconds` の下限チェックを 0 以上に緩め、0打鍵セッションの保存を許す。いずれにせよ `class-design.md` 2.4 の計測定義・値域チェック表・`session-metrics.md` 判断#3・`api-spec.yaml` の400条件の4箇所を同時に揃えること。

### A6. `GET /api/topic-sets/{topicSetId}/sentences` の「お題0件も404」が、詳細設計のどこにも反映されていない

- 対象ファイル・箇所: `class-design.md` 1.4(存在確認の責務・例外→応答の対応表)/ `db-access.md` 4.1 / `sequence.md`(該当図なし)
- 指摘内容: `api-spec.yaml` は当該エンドポイントの404を「指定したお題セットが存在しない、**またはお題が0件**」と定義している。しかし今回確定した「存在確認の責務」は `TopicSetRepository.existsById` による topicSetId の存在確認のみで、「取得結果が0件なら404」という規則がどこにも書かれていない。例外→応答の対応表にも該当行がない。設計書だけを見た実装者は 200 + 空配列を返し、API仕様に違反する。
- 推奨対応: `class-design.md` 1.4 の存在確認の責務に「`TopicSetService` はお題文一覧が0件の場合も `TopicSetNotFoundException`(404)を投げる」旨を追記する(`code` を分けるかも決めること)。他のGET系(履歴0件・自己ベスト0件)は200であることと明確に対比させる。

### A7. `sequence.md` 5.1・`class-design.md` 2.4 が参照する「もう一度送信」ボタンが、`screen-design.md` S-04 に存在しない

- 対象ファイル・箇所: `sequence.md` 5.1(「エラー表示+「もう一度送信」ボタン(**screen-design.md S-04備考**)」)/ `class-design.md` 2.4 送信失敗時の再送 / `screen-design.md` S-04・`change-log.md`
- 指摘内容: `screen-design.md` S-04 の備考は「保存失敗時はエラー表示に切り替える(NFR-09)」のままで、「もう一度送信」ボタンも二重送信防止も記載がない(表示項目にもボタン行が無い)。`nonfunctional-design.md` NFR-09 も「500応答を受けて S-04 にエラー表示を出す(screen-design.md S-04 に記載済み)」で止まっている。つまり P3 側だけが新しい UI 要素を前提にしており、参照先が実在しないダングリング参照になっている。加えて `change-log.md` に CL 記録が無く、`CLAUDE.md`/`change-log.md` の運用ルール(確定済み成果物を変更したら記録する)を満たしていない。CL-003→CL-008→CL-011 と3度指摘されている「下流の決定を上流へ戻さない」再発でもある。
- 推奨対応: `screen-design.md` S-04(表示項目に再送ボタン、備考に再送・二重送信防止・成功まで一時ログ保持)と、必要なら NFR-09 を更新し、`change-log.md` に CL-013 として記録する。

---

## 重要度B(推奨)

### B1. `sequence.md` 図2〜4 が `api/` クライアント層を飛ばして View→Controller 直結になっている

- 対象ファイル・箇所: `sequence.md` 2章・3章・4章(図1・5.1 と比較)
- 指摘内容: 図1と5.1は `sessionApi` を participant に立てているが、図2〜4は `HistoryView`/`MissAnalysisView` が直接 `SessionController` を呼ぶ形になっている。`class-design.md` 2.3 は全API呼び出しを `sessionApi.ts`/`missAnalysisApi.ts` 経由と定めており、粒度が不揃い。5.2 の共通404ハンドリングが `api/` 層で発火する前提とも読み合わせづらい。
- 推奨対応: 図2〜4にも `Api as sessionApi`/`missAnalysisApi` を1参加者として入れる(図が長くなるのを避けたいなら、冒頭に「図2〜4は `api/` 層の中継を省略している」と1行注記する)。

### B2. `sequence.md` 図4(ミス分析)に userId 存在確認のステップが無い

- 対象ファイル・箇所: `sequence.md` 4章 / `class-design.md` 1.4 存在確認の責務
- 指摘内容: 今回の修正で図2・図3には `Svc->>Svc: userId存在確認(404対象)` が入ったが、図4(`MissAnalysisService.getMissAnalysis`)には入っていない。`class-design.md` 1.4 は「userId を受け取る全エンドポイントで Service の入口で存在確認」と定めており、`api-spec.yaml` も404を定義しているため、図だけ取り残されている。
- 推奨対応: 図4の `Ctrl->>Svc` の直後に存在確認ステップを追加する。

### B3. 送信失敗時に「どの画面に居るのか」が2文書で読み取り方が異なる

- 対象ファイル・箇所: `class-design.md` 2.4(「一時ログを破棄せず保持したまま**結果画面に留まる**」)/ `sequence.md` 図1(201受信後に `ResultViewへ遷移`)・5.1(`Store->>View: エラー表示`)
- 指摘内容: 図1では成功(201)して初めて ResultView へ遷移する。5.1では失敗時に ResultView へエラーを表示する。`class-design.md` は「結果画面に留まる」と書く。失敗時に S-03 に留まってエラーを出すのか、結果値が無いまま S-04 へ遷移してエラーと再送ボタンだけを出すのかが一意に決まらない(S-04 の表示項目は全てバックエンド算出値なので、遷移する場合は空表示になる)。
- 推奨対応: どちらかに確定して3箇所の記述を揃える(推奨は「送信中は S-03 のままローディング、失敗したら S-03 上にエラー+再送」か「S-04 へ遷移し、指標欄は非表示にしてエラー+再送のみ」の明示)。

### B4. FR-10 の率(`missRate`/`accuracyRate`)の丸め規則が未定義で、アドバイス閾値判定が揺れる

- 対象ファイル・箇所: `db-access.md` 4.3 / `advice-generation.md` 2章 カテゴリ2 / `class-design.md` 1.3 `KanaMissStat`
- 指摘内容: `session-metrics.md` は丸めを HALF_UP・出口で1回と確定したが、ミス分析側の率の丸め桁・タイミングはどの文書にも無い。さらに `advice-generation.md` カテゴリ2は `総出現回数(推定) = missCount ÷ (missRate ÷ 100)` と逆算しており、`missRate` の丸め桁次第で「最低出現5回」の閾値判定が境界でぶれる(`missRate` が整数丸めなら誤差が大きい)。`byCharType` は `occurrenceCount` を持つのに `byKana` は持たないため逆算が必要になっている。
- 推奨対応: (a) `MissAnalysis.byKana` に `occurrenceCount` を追加して逆算を廃止する(`api-spec.yaml`/`class-design.md` 1.3 `KanaMissStat` の変更が必要)、または (b) 率の丸め規則(桁・モード・丸め前の値を判定に使うこと)を `db-access.md` 4.3 に明記する。P3時点では (b) の1行追記でも可。

### B5. `byErrorPattern.expectedKey` がカンマ区切り文字列のため、アドバイス文・S-06表示が不自然になる

- 対象ファイル・箇所: `db-access.md` 3章・4.3(誤りパターン別クエリ)/ `advice-generation.md` 3章 `pattern` テンプレート
- 指摘内容: `expected_key` は複数候補時に `"c,s"` の形で保存される。`GROUP BY expectedKey, actualKey` するとこの文字列がそのままキーになり、テンプレートは「"c,s"を"x"と入力してしまうミスが目立ちます」という文を生成する。分析としては正しくても利用者向けの文としては不自然で、表示時の整形規則がどこにも定義されていない。
- 推奨対応: テンプレート側で「`,` を「または」に置換する」等の整形規則を `advice-generation.md` 3章に1行加える(P5送りでも可だが、決めるのは今のほうが安い)。

### B6. `直前に確定した拍`(prevKana)と`持ち越しキー`のお題文またぎの持ち回りが、6章の疑似コードに現れていない

- 対象ファイル・箇所: `romaji-automaton.md` 6.0・6.1(`この拍を確定する`)・7.1
- 指摘内容: 7.1 は「`prevKana` は**お題文をまたいでも**前の文の最後の拍を引き継ぐ」と確定したが、6.0 の `拍列を判定する(拍列)` は1文分の拍列を受け取る関数で、初期化するのは `次拍への絞り込み候補` と `持ち越しキー` のみ。`直前に確定した拍` は 6.1 のコメントに「セッション全体で持ち回る状態」とあるだけで、どこが保持し、次のお題文の呼び出しへどう渡すかが疑似コード上に無い(A4で `sequenceJudge` の内部状態として書き直せば同時に解決する)。お題文の最後の拍で押し戻しが発生した場合(文末は即確定なので通常は起きないが、促音・拗音では起こりうる)の `持ち越しキー` の扱いも未記載。
- 推奨対応: `sequenceJudge` が保持するセッション横断状態を1つの表にまとめ、「お題文の切り替え時にリセットするもの/しないもの」を明示する。

### B7. `POST /api/sessions` の `previousBest` が0件のときの表現が未定義

- 対象ファイル・箇所: `class-design.md` 1.4 `SessionService` / `db-access.md` 4.2 / `api-spec.yaml` `SessionResult.previousBest`
- 指摘内容: `db-access.md` 4.2 は GET `/best` について「0件なら `PersonalBest`(両フィールドnull)を200で返す」と確定したが、`POST /api/sessions` の `previousBest` は「初回の場合 null」(オブジェクトごとnull)と定義されている。同じMAXクエリの結果を2通りに詰め替える必要があるが、その分岐がどちらの文書にも書かれていない。
- 推奨対応: `class-design.md` 1.4 の `SessionService` の責務に「MAXが両方nullなら `previousBest` は null とし、`isNetKpmBest`/`isAccuracyBest` は true」と1行加える。

---

## 重要度C(参考)

### C1. `romaji-automaton.md` 9章に旧分類の用語が残っている

- 箇所: 9章 2番目の箇条書き「5.1 撥音んの分岐(次拍が**母音行/や行/子音行**/文末それぞれ)」
- 内容: 判断#7 で「母音行/子音行の2分類」は廃止され、「次の拍の受理パターンの先頭文字を見る」方式に変わっている。テスト申し送りの表現だけ旧用語のまま。
- 推奨対応: 「次拍の先頭文字候補が母音/`y`/`n` を含むか否か」の表現に置き換える。

### C2. 90秒タイムアウトの根拠として NFR-03 を引いているが、上流に秒数の記載が無い

- 箇所: `class-design.md` 2.3 `client.ts`
- 内容: `nonfunctional-design.md` NFR-03 は「コールドスタート遅延(数十秒程度)を許容」までで、90秒という値はP3で新規に決めたもの。参照の書き方だと上流に書いてあるように読める。
- 推奨対応: 「(P3で決定。根拠はNFR-03のコールドスタート許容)」と出典と決定場所を分けて書く。

### C3. `class-design.md` 1.5 のトレーサビリティ表に FR-02/FR-03 の行が無い

- 内容: FR-01の次がFR-04で、フロント完結のため対象外である旨の行が無い。2.8 側には両方あるので読み合わせれば分かるが、1.5 単体では「抜け」に見える。
- 推奨対応: FR-02/FR-03 の行を `— | —(フロントエンド完結、ADR-002)` として追加する。

### C4. `sequence.md` 5.3 が「userIdあり かつ 遷移先がS-01」のケースを扱っていない

- 内容: `screen-design.md` 2章は「値があれば S-02 から始まる」としているが、5.3 の図は「userIdなし→S-01」だけを描いている。ルート(`/`)アクセス時に S-02 へ送る挙動と、「別の名前で始める」で意図的に S-01 へ行く場合の扱いが図から読めない。
- 推奨対応: 図に「userIdあり かつ 遷移先がS-01 → S-02 へリダイレクト。ただし『別の名前で始める』経由(localStorageクリア後)は対象外」と注記する。

### C5. `db-access.md` 7章の `R__` シードマイグレーションの冪等性に触れていない

- 内容: 繰り返し可能マイグレーションはチェックサム変更のたびに再実行されるため、単純な `INSERT` だと重複行が入る。`sentences` は UNIQUE 制約が無いので特に事故りやすい。
- 推奨対応: 「`R__` は冪等に書く(`ON CONFLICT` またはお題マスタを全削除→再投入)」の1行を追記する。実ファイルの作成はP5でよい。

### C6. 「セッション全体で通し番号」という表現が、`api-spec.yaml`/TBL-05 の説明と読み方が揃っていない

- 箇所: `romaji-automaton.md` 7.1 `kanaOccurrenceNo`
- 内容: 実体は「かなの種類ごとのカウンタを、お題文をまたいでリセットしない」だが、「セッション全体で通し番号」だけ読むとセッション内の単一連番と誤読しうる。`api-spec.yaml`・TBL-05 は「かなの種類ごとに1から数え直す」と書いている。
- 推奨対応: 「かなの種類ごとのカウンタを、セッション内では(お題文をまたいでも)リセットしない」と言い換える。

### C7. 破棄した打鍵と `keystrokeIntervalsMs` の関係が未記載

- 箇所: `class-design.md` 2.4 FR-05計測定義 / `romaji-automaton.md` 7.1
- 内容: 制限時間モードで打鍵途中の拍は `correctKeyCount`/`kanaCounts`/ミス記録から除外されるが、`keystrokeIntervalsMs` には(「正誤を問わず全キー入力」の定義上)含まれたままになる。意図的なら問題ないが、テスト設計(P4)で判断が割れる。
- 推奨対応: 7.1 の `keystrokeIntervalsMs` 行に「破棄した拍の打鍵も間隔としては含める(Consistencyは打鍵リズムの指標のため)」と1行足す。

---

## 観点別の総括

**1. トレーサビリティ**: FR-01〜FR-13 は `class-design.md` 1.5・2.8 の両表で漏れなく設計要素に対応付けられており、TBL-01〜06 も `db-access.md` 2章で全件マッピングされている(FR-02/FR-03 が 1.5 に現れない点は C3 の軽微指摘)。逆方向(設計→FR)も各表に対応FR列があり成立している。ただし `api-spec.yaml` の契約1件(お題0件で404)が設計に落ちていない(A6)。

**2. charter.md との整合性**: MVPスコープ 3.1 の8項目はいずれも今回の6文書でカバーされている。3.2 のスコープ外(認証・お題投稿UI・ランキング等)に踏み込む記述は無い。`db-access.md` 7章のシードデータFlyway管理は「開発者によるシードデータ投入」の範囲内で、お題投稿UIの先取りではない。NFR-08(受入リスク)とも整合。問題なし。

**3. 内部矛盾・曖昧さ**: 今回の重点観点。型名(`SessionMetricsInput`/`SessionMetricsResult`)は3文書で完全に統一され、`SessionInput`/`missRecords`(配列)の残存は無い。`reading` の残存も全文書で0件で、`mora_list`/`moraList` に統一されている(`table-definition.md`・`api-spec.yaml` 側も更新済み)。丸めモード HALF_UP・桁あふれの責務分担・404判定順序・例外対応表・値域チェック表は `api-spec.yaml` の記述とも一致している。一方で、判定エンジンとストアの境界(A1・A3・A4)、ヒント規則の自己矛盾(A2)、durationSecondsの前提衝突(A5)という**修正によって新たに生じた/取り残された矛盾が5件**残っている。いずれも「今回追加した規則」と「既存の疑似コード・上流仕様」の接続部分に集中している。

**4. 完了条件の充足**: 未充足。`workflow.md` P3完了条件「設計書だけを渡した Claude が実装を書き切れる粒度」に対し、バックエンド側(Controller/Service/Repository/例外/クエリ/トランザクション/インデックス/シード)はほぼ書き切れる状態に達していると判断できる。しかしフロントエンドの `judgment-engine` ↔ `sessionStore` 境界は、A1(ミス記録・拍確定情報の受け渡し経路が無い)・A4(関数の呼び出しモデルが疑似コードと不一致)により実装を開始できない。A2・A3・A5・A6 も実装が一意に決まらない/仕様違反になる。A1〜A7のクローズ後に再判定が必要。

**5. 過剰・スコープ超過**: 問題なし。追加された規則(例外対応表・値域チェック表・出力順序/NULL扱い・再送ボタン・ルーターガード)はいずれもMVPを動かすために必要な最小限で、charter.md 6章の完走優先方針に反する肥大化は見られない。`db-access.md` 4.3 の「件数上限を設けない」判断も、根拠(集計後の行数は種類数で頭打ち)が示されており過剰実装を避ける側の判断として妥当。P2/P3で決めるべきでない項目(Flywayファイル分割・共通エラーハンドラの物理配置・UI文言)は適切にP5へ送られている。
