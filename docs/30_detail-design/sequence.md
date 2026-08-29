---
doc_id: DD-002
status: fixed
updated: 2026-08-29
---

# シーケンス図

`class-design.md`・`db-access.md` で確定したクラス・クエリを、実際の呼び出し順序として整理する。クラス名は `class-design.md` と同じものを使う。

---

## 1. セッション実行〜結果保存(正常系、FR-04〜09)

```mermaid
sequenceDiagram
    participant View as TypingView
    participant Engine as sequenceJudge(judgment-engine)
    participant Store as sessionStore
    participant Api as sessionApi
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Calc as SessionMetricsCalculator(typing-core)
    participant Repo as SessionRepository等

    View->>Engine: キー入力を渡す
    Engine-->>View: KeystrokeResult(確定/ミス/ヒント)
    View->>Store: KeystrokeResultを渡す(correctKeyCount・kanaOccurrenceNo等を集計。romaji-automaton.md 7.1)
    Store->>Store: 終了条件を判定(sentence_count/time_limit。class-design.md 2.4)
    Note over View,Store: 終了条件達成まで繰り返し(通信なし、ADR-002)
    Store->>Api: submitSession(SessionSubmission)
    Api->>Ctrl: POST /api/sessions
    activate Svc
    Ctrl->>Svc: submitSession(...)
    Svc->>Svc: userId/topicSetId存在確認(404対象、class-design.md 1.4)
    Svc->>Svc: 値域チェック(400対象、class-design.md 1.4値域チェック表)
    Svc->>Calc: calculate(correctKeyCount, missRecordCount, keystrokeIntervalsMs, durationSeconds)
    Calc-->>Svc: SessionMetricsResult
    Svc->>Svc: 桁あふれチェック(400対象)
    Svc->>Repo: 自己ベスト取得(MAX netKpm/accuracy)
    Repo-->>Svc: 現在の自己ベスト
    Svc->>Svc: isNetKpmBest/isAccuracyBest判定
    Svc->>Repo: sessions/miss_records/session_kana_countsを1トランザクションで保存
    Repo-->>Svc: 保存結果
    Svc-->>Ctrl: SessionResult
    deactivate Svc
    Ctrl-->>Api: 201 SessionResult
    Api-->>Store: SessionResult
    Store->>Store: 一時ログを破棄
    Store->>View: ResultViewへ遷移(結果を渡す)
```

`Svc→Repo`の保存3行は `@Transactional` の1トランザクション内(`db-access.md` 5章)。送信失敗時の扱いは5.1参照。

## 2. 履歴一覧取得(FR-08)

```mermaid
sequenceDiagram
    participant View as HistoryView
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Repo as SessionRepository

    View->>Ctrl: GET /api/users/{userId}/sessions
    Ctrl->>Svc: listSessionHistory(userId)
    Svc->>Svc: userId存在確認(404対象)
    Svc->>Repo: findByUserIdOrderByPlayedAtDesc(userId)
    Repo-->>Svc: List<Session>(0件も可)
    Svc->>Svc: SessionSummaryへ変換
    Svc-->>Ctrl: List<SessionSummary>
    Ctrl-->>View: 200 List<SessionSummary>
```

## 3. 自己ベスト取得(FR-09)

```mermaid
sequenceDiagram
    participant View as HistoryView
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Repo as SessionRepository

    View->>Ctrl: GET /api/users/{userId}/best?topicSetId=...
    Ctrl->>Svc: getPersonalBest(userId, topicSetId)
    Svc->>Svc: userId/topicSetId存在確認(404対象。0件と不存在を区別するため、MAXクエリとは別に確認する)
    Svc->>Repo: MAX(netKpm), MAX(accuracy)(db-access.md 4.2)
    Repo-->>Svc: netKpmBest/accuracyBest(0件ならnull)
    Svc-->>Ctrl: PersonalBest
    Ctrl-->>View: 200 PersonalBest
```

## 4. ミス分析・改善アドバイス取得(FR-10, FR-11)

```mermaid
sequenceDiagram
    participant View as MissAnalysisView
    participant Ctrl as MissAnalysisController
    participant Svc as MissAnalysisService
    participant Repo as MissRecordRepository/SessionKanaCountRepository
    participant Advice as AdviceGenerator(typing-core)

    View->>Ctrl: GET /api/users/{userId}/miss-analysis
    Ctrl->>Svc: getMissAnalysis(userId)
    Svc->>Repo: 拍単位ミス集合(DISTINCT ON)取得(db-access.md 4.3)
    Svc->>Repo: 誤りパターン別カウント取得
    Svc->>Repo: かな/文字種別 出現回数合計取得
    Repo-->>Svc: 各集計結果
    Svc->>Svc: kana/prevKana/charTypeごとに突き合わせ、率を計算
    Svc->>Advice: generate(MissAnalysisInput)
    Advice-->>Svc: advice(0〜3件)
    Svc-->>Ctrl: MissAnalysis(4観点+advice)
    Ctrl-->>View: 200 MissAnalysis
```

---

## 5. エラー系

### 5.1 送信失敗時(DB障害・タイムアウト等、NFR-09/ops-reviewer A1対応)

```mermaid
sequenceDiagram
    participant Store as sessionStore
    participant Api as sessionApi
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Handler as GlobalExceptionHandler
    participant View as ResultView

    Store->>Api: submitSession(SessionSubmission)
    Api->>Ctrl: POST /api/sessions
    Ctrl->>Svc: submitSession(...)
    Svc--xSvc: 保存失敗(制約違反・DB接続断等)
    Svc-->>Handler: 例外スロー(トランザクションはロールバック)
    Handler->>Handler: traceId採番、500ログ出力(NFR-07)
    Handler-->>Api: 500 ErrorResponse(またはタイムアウト90秒でクライアント側エラー)
    Api-->>Store: 送信失敗(一時ログは破棄しない)
    Store->>View: エラー表示+「もう一度送信」ボタン(screen-design.md S-04備考)
    View->>Store: 「もう一度送信」押下
    Store->>Api: submitSession(同じSessionSubmission)
    Note over Store,Api: 成功(201)するまで一時ログは保持したまま。成功時のみ破棄しResultViewへ進む(送信中はボタン無効化)
```

### 5.2 利用者未存在時(ADR-003、userId系APIで404)

```mermaid
sequenceDiagram
    participant View as 任意のView(S-02/S-03/S-04/S-05/S-06)
    participant Api as api/(userId系エンドポイント)
    participant Ctrl as Controller
    participant Handler as GlobalExceptionHandler
    participant UserStore as userStore
    participant Router as router

    View->>Api: userIdを含むリクエスト
    Api->>Ctrl: (Controller呼び出し)
    Ctrl--xCtrl: userId不在(UserNotFoundException)
    Ctrl-->>Handler: 例外スロー
    Handler-->>Api: 404 ErrorResponse
    Api-->>View: エラーをthrow
    View->>UserStore: userId/nameをクリア(localStorage含む)
    View->>Router: S-01へ強制遷移
```

`screen-design.md` 2章の「userIdが存在しないとき」の導線を、呼び出し元(どのViewからでも共通処理として発火する)として明確化した。具体的な実装(共通エラーハンドラをどこに置くか)はP5で決める。

### 5.3 起動時のuserId復元とルーターガード(2026-08-29、ゲート③ doc-reviewer A6対応)

`class-design.md` 2.7が本ファイルへ委譲していた遷移ガードを確定する。5.2はAPIが404を返した(userIdが失効していた)場合の導線であるのに対し、こちらは`screen-design.md` 2章のもう一方の導線(起動時にlocalStorageの値が無い場合)を扱う。

```mermaid
sequenceDiagram
    participant Router as router(ナビゲーションガード)
    participant UserStore as userStore
    participant View as 遷移先View

    Router->>UserStore: userId(localStorage)を確認
    alt userIdが存在する
        UserStore-->>Router: userIdあり
        Router->>View: 遷移先へ進む
    else userIdが存在しない
        UserStore-->>Router: userIdなし
        Router->>View: S-01(NameInputView)へリダイレクト
    end
```

---

## 6. 未決事項

- 共通エラーハンドラ(5.2)の物理的な実装配置はP5で決める(ブロッカーではない)
