---
doc_id: DD-002
status: draft
updated: 2026-08-29
---

# シーケンス図

`class-design.md`・`db-access.md` で確定したクラス・クエリを、実際の呼び出し順序として整理する。クラス名は `class-design.md` と同じものを使う。

---

## 1. セッション実行〜結果保存(正常系、FR-04〜09)

```mermaid
sequenceDiagram
    participant View as TypingView
    participant Engine as judgment-engine
    participant Store as sessionStore
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Calc as SessionMetricsCalculator(typing-core)
    participant Repo as SessionRepository等

    View->>Engine: キー入力を渡す
    Engine-->>View: KeystrokeResult(確定/ミス)
    View->>Store: 正誤・ミス記録を蓄積
    Note over View,Store: 終了条件達成まで繰り返し(通信なし、ADR-002)
    Store->>Ctrl: POST /api/sessions(SessionSubmission)
    activate Svc
    Ctrl->>Svc: submitSession(...)
    Svc->>Svc: 値域チェック(400対象、api-spec.yaml)
    Svc->>Calc: calculate(correctKeyCount, missRecordCount, keystrokeIntervalsMs, durationSeconds)
    Calc-->>Svc: SessionMetricsResult
    Svc->>Repo: 自己ベスト取得(MAX netKpm/accuracy)
    Repo-->>Svc: 現在の自己ベスト
    Svc->>Svc: isNetKpmBest/isAccuracyBest判定
    Svc->>Repo: sessions/miss_records/session_kana_countsを1トランザクションで保存
    deactivate Svc
    Repo-->>Ctrl: SessionResult
    Ctrl-->>Store: 201 SessionResult
    Store->>View: ResultViewへ遷移(結果を渡す)
```

`Svc→Repo`の保存3行は `@Transactional` の1トランザクション内(`db-access.md` 5章)。

## 2. 履歴一覧取得(FR-08)

```mermaid
sequenceDiagram
    participant View as HistoryView
    participant Ctrl as SessionController
    participant Repo as SessionRepository

    View->>Ctrl: GET /api/users/{userId}/sessions
    Ctrl->>Repo: findByUserIdOrderByPlayedAtDesc(userId)
    Repo-->>Ctrl: List<Session>(0件も可)
    Ctrl-->>View: 200 List<SessionSummary>
```

## 3. 自己ベスト取得(FR-09)

```mermaid
sequenceDiagram
    participant View as HistoryView
    participant Ctrl as SessionController
    participant Repo as SessionRepository

    View->>Ctrl: GET /api/users/{userId}/best?topicSetId=...
    Ctrl->>Repo: MAX(netKpm), MAX(accuracy)(db-access.md 4.2)
    Repo-->>Ctrl: netKpmBest/accuracyBest(0件ならnull)
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

### 5.1 DB障害時(NFR-09、セッション保存失敗)

```mermaid
sequenceDiagram
    participant Store as sessionStore
    participant Ctrl as SessionController
    participant Svc as SessionService
    participant Handler as GlobalExceptionHandler
    participant View as ResultView

    Store->>Ctrl: POST /api/sessions
    Ctrl->>Svc: submitSession(...)
    Svc--xSvc: 保存失敗(制約違反・DB接続断等)
    Svc-->>Handler: 例外スロー(トランザクションはロールバック)
    Handler->>Handler: traceId採番、500ログ出力(NFR-07)
    Handler-->>Store: 500 ErrorResponse
    Store->>View: エラー表示に切り替え(screen-design.md S-04備考)
```

### 5.2 利用者未存在時(ADR-003、userId系APIで404)

```mermaid
sequenceDiagram
    participant View as 任意のView(S-02/S-04/S-05/S-06)
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

---

## 6. 未決事項

なし。
