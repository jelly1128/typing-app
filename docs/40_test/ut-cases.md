---
doc_id: TST-002
status: fixed
updated: 2026-08-30
---

# 単体テストケース(UT)

`test-plan.md` 2.1節の対象・ID体系に従う。P4-03。Kazuki確認済み(2026-08-30)。

## 1. `typing-core`

### 1.1 `SessionMetricsCalculator`(`logic-spec/session-metrics.md`)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID | testdata ID |
|---|---|---|---|---|---|---|
| UT-001 | `SessionMetricsCalculator.calculate` | 通常ケースでNet/Raw KPM・正確率が数式どおり | correctKeyCount/missRecordCount/durationSecondsの組み合わせ複数 | 数式(`session-metrics.md`2章)どおりの値 | FR-06 | SM-001〜 |
| UT-002 | 同上 | keystrokeIntervalsMsが0〜1要素 | 要素数0または1 | consistency=0 | FR-06 | SM-002 |
| UT-003 | 同上 | durationSeconds=0のみ(総キー入力数>0)で既定値が返る(`session-metrics.md`4章判断#3は「または」条件で、2条件は独立) | durationSeconds=0、correctKeyCount=50、missRecordCount=5 | netKpm/rawKpmは0(既定値)。accuracyは通常どおりcorrectKeyCount÷総キー入力数で算出される(0にならない) | FR-06 | SM-003 |
| UT-004 | 同上 | 総キー入力数=0のみ(durationSeconds>0)で既定値が返る | durationSeconds=60、correctKeyCount=0、missRecordCount=0 | accuracyは0(既定値、0除算回避)。netKpm/rawKpmは0(0を時間で割るため自然に0、既定値分岐は不要) | FR-06 | SM-004 |
| UT-005 | 同上 | durationSeconds=0かつ総キー入力数=0(両方) | durationSeconds=0、correctKeyCount=0、missRecordCount=0 | netKpm/rawKpm/accuracyすべて0(既定値) | FR-06 | SM-005 |
| UT-006 | 同上 | 丸めモードHALF_UPの境界値 | 中間値33.335等 | 33.34(HALF_UP) | FR-06 | SM-006 |

### 1.2 `AdviceGenerator`(`logic-spec/advice-generation.md`)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID | testdata ID |
|---|---|---|---|---|---|---|
| UT-007 | `AdviceGenerator.generate` | カテゴリ1(誤りパターン)単独該当 | byErrorPatternが閾値以上の1件 | advice配列に1件 | FR-11 | AG-001 |
| UT-008 | 同上 | カテゴリ2(かな別)単独該当 | byKanaが閾値以上の1件 | advice配列に1件 | FR-11 | AG-002 |
| UT-009 | 同上 | カテゴリ3(文字種別)単独該当・閾値未満は非該当 | byCharTypeの正解率が閾値ちょうど/閾値未満 | ちょうどは該当、未満は非該当 | FR-11 | AG-003, AG-004 |
| UT-010 | 同上 | 全観点空(セッション0件) | byKana/byErrorPattern/byCharTypeすべて空配列 | advice=[] | FR-11 | AG-005 |
| UT-011 | 同上 | セッションはあるが全観点該当なし/正解率100 | ミス記録0件 | advice=["good"の1件] | FR-11 | AG-006 |
| UT-012 | 同上 | 2カテゴリ以上同時該当時の表示順 | byErrorPattern・byKana両方が閾値以上 | 「誤りパターン→かな別→文字種別」の順で配列に格納 | FR-11 | AG-007 |

## 2. `judgment-engine`

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID | testdata ID |
|---|---|---|---|---|---|---|
| UT-013 | `sequenceJudge` | 4章の清音異表記が全て受理される | し=si/shi/ci 等 | 各表記で拍が確定 | FR-02 | RA-001〜 |
| UT-014 | `sequenceJudge` | 4章の拗音異表記が全て受理される | しゃ=sya/sha 等 | 各表記で拍が確定 | FR-02 | RA-0xx |
| UT-015 | `sequenceJudge` | 撥音ん、次拍が母音/や行 | 次拍が母音行またはや行 | "n"単体では確定不可、"nn"が必要 | FR-02 | RA-0xx |
| UT-016 | `sequenceJudge` | 撥音ん、次拍がな行(B6対応) | 次拍がな/に/ぬ/ね/の | "n"単体では確定不可、"nn"が必要 | FR-02 | RA-0xx |
| UT-017 | `sequenceJudge` | 撥音ん、次拍が子音行(な行以外) | 次拍がか行等 | "n"単体で確定 | FR-02 | RA-0xx |
| UT-018 | `sequenceJudge` | 撥音ん、文末 | んがお題文の最後の拍 | "n"単体で即確定 | FR-02 | RA-0xx |
| UT-019 | `sequenceJudge` | 撥音ん、"n"単体入力後の押し戻し | "n"の次に子音を入力 | 押し戻され次拍の判定に使われる(A2対応) | FR-02 | RA-0xx |
| UT-020 | `sequenceJudge` | 促音っ、子音重ね方式の伝播(A3対応) | っし → "kk"等の重ね表記 | 次拍(し)の表記がs/cに絞られる | FR-02 | RA-0xx |
| UT-021 | `sequenceJudge` | 促音っ、独立表記方式は絞り込まない | xtu/xtsu/ltu/ltsu | 次拍は全パターン許容のまま | FR-02 | RA-0xx |
| UT-022 | `sequenceJudge` | 長音ー、ハイフンキー1つで確定 | 直前拍の表記に関わらず | "-"1つで確定(ADR-004) | FR-02 | RA-0xx |
| UT-023 | `sequenceJudge` | 誤入力時のミス記録と足止め | 不正キーを入力 | ミスとして記録され、正しいキーまで進まない | FR-02, FR-04 | RA-0xx |
| UT-024 | `sequenceJudge` | kanaOccurrenceNoがお題文をまたいでリセットされない | 複数お題文を連続処理 | カウンタがリセットされず通し番号になる | FR-04 | RA-0xx |
| UT-025 | `sequenceJudge` | 同じかなが連続する拍でも区別される(REV-013 A3) | 「おおきい」等 | moraIndexの変化により別出現として区別 | FR-04 | RA-0xx |
| UT-026 | `sequenceJudge` | prevKanaの引き継ぎ | セッション最初の拍/お題文境界 | 最初のみnull、以降は文をまたいでも維持 | FR-04 | RA-0xx |
| UT-027 | `sequenceJudge` | 画面ヒントの動的選択 | 「し」で"s"入力後 | 残候補("i")のみがヒントに残る | FR-03 | RA-0xx |

## 3. `api`(Service層、Repositoryはモック化)

メソッドシグネチャは `class-design.md` 1.4(2026-08-30追加)を参照。

### 3.1 `UserService`

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-028 | `identifyUser` | 新規作成 | 未登録の名前 | 新規Userを作成し返す(200) | FR-12 |
| UT-029 | `identifyUser` | 既存ヒット(trim一致) | 前後空白付きで既存名と一致 | 既存Userを返す(大文字小文字は区別) | FR-12 |
| UT-030 | `identifyUser` | trim後0文字 | 空白のみの入力 | 400 | FR-12 |
| UT-031 | `identifyUser` | trim後101文字 | 101文字の名前 | 400 | FR-12 |
| UT-032 | `identifyUser` | trim後100文字ちょうど | 100文字の名前 | 成功 | FR-12 |

### 3.2 `TopicSetService`

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-033 | `listTopicSets` | 正常系 | topic_sets複数件 | sort_order順の一覧 | FR-13 |
| UT-034 | `listSentences` | 正常系 | 存在するtopicSetId | お題文一覧 | FR-01, FR-13 |
| UT-035 | `listSentences` | topicSetId不存在 | 存在しないID | 404(`TopicSetNotFoundException`) | FR-01, FR-13 |
| UT-036 | `listSentences` | 取得結果0件(REV-013 A6) | topicSetIdは存在するがsentencesが0件 | 404 | FR-01, FR-13 |

### 3.3 `SessionService`

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-037 | `submitSession` | 正常系(自己ベスト更新あり) | 有効なリクエスト、既存ベストより良い値 | 201相当、isNetKpmBest/isAccuracyBestがtrue | FR-04〜09 |
| UT-038 | `submitSession` | userId不存在 | 存在しないuserId | 404(`UserNotFoundException`) | FR-04〜09 |
| UT-039 | `submitSession` | topicSetId不存在 | 存在しないtopicSetId | 404(`TopicSetNotFoundException`) | FR-04〜09 |
| UT-040 | `submitSession` | userId/topicSetId両方不存在 | 両方存在しない | userIdを先に404判定 | FR-04〜09 |
| UT-041 | `submitSession` | endConditionValue範囲外 | sentence_countで51、time_limitで601等 | 400 | FR-06 |
| UT-042 | `submitSession` | durationSeconds負値 | -1 | 400 | FR-06 |
| UT-043 | `submitSession` | durationSeconds=0許容(REV-013 A5) | 0(制限時間モード0打鍵) | 400にならず処理継続 | FR-06 |
| UT-044 | `submitSession` | correctKeyCount負値 | -1 | 400 | FR-06 |
| UT-045 | `submitSession` | keystrokeIntervalsMsに負値 | 負の要素を含む配列 | 400 | FR-06 |
| UT-046 | `submitSession` | kanaCountsの同一kana重複 | 同じkanaが2要素 | 400 | FR-06 |
| UT-047 | `submitSession` | missRecords[].kanaがkanaCountsに不一致 | 対応するkanaCountsが無いkana | 400 | FR-04, FR-06 |
| UT-048 | `submitSession` | netKpm/rawKpmが桁上限超過 | TBL-04の9999.99超過となる入力 | 400 | FR-06 |
| UT-049 | `submitSession` | 初回セッション(previousBestがnull、REV-013 B7) | 該当ユーザー・難易度のセッションが0件 | previousBest=null、isNetKpmBest/isAccuracyBestともにtrue | FR-09 |
| UT-050 | `listSessionHistory` | 正常系 | 複数セッション | played_at降順の一覧 | FR-08 |
| UT-051 | `listSessionHistory` | userId不存在 | 存在しないuserId | 404 | FR-08 |
| UT-052 | `listSessionHistory` | 0件 | セッションが1件も無いユーザー | 空配列(200) | FR-08 |
| UT-053 | `getPersonalBest` | 正常系 | 複数セッション | KPM最大・正確率最大 | FR-09 |
| UT-054 | `getPersonalBest` | userId/topicSetId不存在 | いずれか存在しない | 404 | FR-09 |
| UT-055 | `getPersonalBest` | 該当難易度0件 | セッションはあるが指定難易度が0件 | netKpmBest/accuracyBestがnull | FR-09 |

### 3.4 `MissAnalysisService`

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-056 | `getMissAnalysis` | 正常系(4観点集計) | ミス記録複数件 | byKana/byErrorPattern/byPrevKana/byCharTypeが多い順 | FR-10, FR-11 |
| UT-057 | `getMissAnalysis` | userId不存在 | 存在しないuserId | 404 | FR-10, FR-11 |
| UT-058 | `getMissAnalysis` | セッション0件 | 対象ユーザーのセッションが無い | 4観点すべて空配列、advice=[] | FR-10, FR-11 |
| UT-059 | `getMissAnalysis` | セッションありミス記録0件 | ミスなしで完走 | byKana/byErrorPattern/byPrevKanaは空、byCharTypeは全文字種accuracyRate=100 | FR-10, FR-11 |

## 4. `sessionStore`(Pinia、`class-design.md`2.4)

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-060 | `sessionStore` | `confirmedMora`からcorrectKeyCount/kanaCountsを集計 | KeystrokeResultを複数回受け取る | 採用パターンの文字数が正しく加算される | FR-06 |
| UT-061 | `sessionStore` | `miss`からmissRecords[]を組み立てる | ミスを含むKeystrokeResultを受け取る | kanaOccurrenceNoが現在の採番値で付与される | FR-04 |
| UT-062 | `sessionStore` | 終了条件判定(sentence_countモード) | 確定した文の数がendConditionValueに到達 | セッション終了、送信処理へ | FR-05 |
| UT-063 | `sessionStore` | 終了条件判定(time_limitモード) | durationSecondsの計測がendConditionValueに到達 | セッション終了、送信処理へ | FR-05 |
| UT-064 | `sessionStore` | 制限時間モードで打鍵途中の拍を破棄 | 終了条件到達時に1拍が未確定 | correctKeyCount/kanaCounts/ミス記録のいずれにも計上されない | FR-05 |

## 5. 境界値ケース(doc-B9/ops-B8/test-C4対応)

`wbs.md`のB/C振り分け表でP4担当と申し送られていた doc-B9/ops-B8/test-C4(`byKana`に`occurrenceCount`が無く、`AdviceGenerator`が`missCount ÷ (missRate ÷ 100)`で総出現回数を逆算していた問題)。境界値ケースを書いた結果、未解決であることが判明し、Kazukiと相談のうえ`byKana`に`occurrenceCount`を追加する方針で解決した(CL-016、`byCharType`と同じ対応)。

| ID | 対象 | 概要 | 前提条件 | 期待結果 | 対応FR-ID |
|---|---|---|---|---|---|
| UT-065 | `AdviceGenerator`(カテゴリ2判定) | `missRate`が丸め後0になっても`occurrenceCount`実測値で判定できる | `missCount`>0だが`missRate`が表示用丸めで0.0となるケース、`occurrenceCount`は実測値(例: 6) | ゼロ除算・Infinityが発生せず、`occurrenceCount >= 5`の実測値判定でカテゴリ2の該当可否が決まる | FR-11 |

## 未決事項

- UT-013/014/020/021/022のtestdata ID(`RA-0xx`)を含め、`shared/testdata`本体(JSON)はP4では作成しない。P5で`typing-core`をKazuki自身がTDDで実装する際、テストを書きながら埋める方針(`test-plan.md`3章末尾、2026-08-30合意)
- Repository層(`UserRepository`等)自体はUTでなくIT(3.1節、実DB)で検証する。UTではRepositoryをモック化しService層のロジックのみを見る
