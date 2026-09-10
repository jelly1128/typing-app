import { defineStore } from 'pinia'
import { submitSession } from '../api/sessionApi'
import type {
  EndConditionType,
  KanaCountInput,
  MissRecordInput,
  SessionResult,
  SessionSubmission,
} from '../types/api'
import type { KeystrokeResult } from '../judgment-engine/types'

export const useSessionStore = defineStore('session', {
  state: () => ({
    userId: null as number | null,
    topicSetId: null as number | null,
    endConditionType: null as EndConditionType | null,
    endConditionValue: null as number | null,

    correctKeyCount: 0,
    missRecords: [] as MissRecordInput[],
    keystrokeIntervalsMs: [] as number[],
    kanaCounts: new Map<string, KanaCountInput>(),
    confirmedSentenceCount: 0,

    // `romaji-automaton.md` 7.1: かなの種類ごとの出現連番。お題文をまたいでもリセットしない
    kanaOccurrenceCounters: new Map<string, number>(),
    currentOccurrenceNo: null as number | null,
    lastMoraIndex: null as number | null,

    // セッション開始(time_limitの終了判定の起点)と最初のキー入力(durationSecondsの起点、class-design.md 2.4)は別の時刻
    sessionStartedAt: null as number | null,
    firstKeystrokeAt: null as number | null,
    lastKeystrokeAt: null as number | null,
    endedAt: null as number | null,

    lastSubmission: null as SessionSubmission | null,
    result: null as SessionResult | null,
    isSubmitting: false,
    submitError: false,
  }),
  getters: {
    durationSeconds(state): number {
      if (state.firstKeystrokeAt === null || state.endedAt === null) return 0
      return Math.round((state.endedAt - state.firstKeystrokeAt) / 1000)
    },
    isSentenceCountConditionMet(state): boolean {
      return (
        state.endConditionType === 'sentence_count' &&
        state.endConditionValue !== null &&
        state.confirmedSentenceCount >= state.endConditionValue
      )
    },
  },
  actions: {
    startSession(userId: number, topicSetId: number, endConditionType: EndConditionType, endConditionValue: number) {
      this.userId = userId
      this.topicSetId = topicSetId
      this.endConditionType = endConditionType
      this.endConditionValue = endConditionValue
      this.clearLog()
      this.result = null
      this.submitError = false
      this.sessionStartedAt = Date.now()
    },

    /** time_limitモードの終了判定。sentence_countモードの判定は`isSentenceCountConditionMet`を使う */
    hasTimeLimitElapsed(now: number = Date.now()): boolean {
      if (this.endConditionType !== 'time_limit' || this.sessionStartedAt === null || this.endConditionValue === null) {
        return false
      }
      return (now - this.sessionStartedAt) / 1000 >= this.endConditionValue
    },

    /**
     * お題文の開始時(最初のお題文を含む)に必ず呼ぶ。`moraIndex`は拍が確定した時にしか増えないため、
     * 前の文の最後の拍が確定した直後と次の文の最初の拍がまだ未確定の間で同じ値になりうる。
     * `lastMoraIndex`をリセットし、次の実キー入力を必ず「新しい拍の開始」として検知させる
     * (class-design.md 2.4、romaji-automaton.md 7.1、CL-023)
     */
    startNewSentence() {
      this.lastMoraIndex = null
    },

    /** `judgment-engine`の`KeystrokeResult`を1キー入力ごとに受け取り集計する(romaji-automaton.md 7.1) */
    recordKeystroke(result: KeystrokeResult) {
      const now = Date.now()
      if (this.firstKeystrokeAt === null) {
        this.firstKeystrokeAt = now
      } else if (this.lastKeystrokeAt !== null) {
        this.keystrokeIntervalsMs.push(now - this.lastKeystrokeAt)
      }
      this.lastKeystrokeAt = now

      if (result.moraIndex !== this.lastMoraIndex) {
        this.lastMoraIndex = result.moraIndex
        const nextOccurrenceNo = (this.kanaOccurrenceCounters.get(result.currentKana) ?? 0) + 1
        this.kanaOccurrenceCounters.set(result.currentKana, nextOccurrenceNo)
        this.currentOccurrenceNo = nextOccurrenceNo
      }

      if (result.confirmedMora !== null) {
        const mora = result.confirmedMora
        this.correctKeyCount += mora.acceptedPattern.length
        const existing = this.kanaCounts.get(mora.kana)
        if (existing) {
          existing.totalCount += 1
        } else {
          this.kanaCounts.set(mora.kana, { kana: mora.kana, charType: mora.charType, totalCount: 1 })
        }
      }

      if (result.miss !== null && this.currentOccurrenceNo !== null) {
        const miss = result.miss
        this.missRecords.push({
          kanaOccurrenceNo: this.currentOccurrenceNo,
          kana: miss.kana,
          expectedKey: miss.expectedKey,
          actualKey: miss.actualKey,
          prevKana: miss.prevKana,
          charType: miss.charType,
        })
      }
    },

    /** お題文1本の判定が最後まで完了した時にTypingViewが呼ぶ(sentence_countモードの分母) */
    completeSentence() {
      this.confirmedSentenceCount += 1
    },

    /** 終了条件達成時にTypingViewが呼ぶ。結果を組み立てて送信する */
    async endSession(now: number = Date.now()): Promise<void> {
      this.endedAt = now
      this.lastSubmission = this.buildSubmission()
      await this.submit()
    },

    buildSubmission(): SessionSubmission {
      if (this.userId === null || this.topicSetId === null || this.endConditionType === null || this.endConditionValue === null) {
        throw new Error('セッションが開始されていません')
      }
      return {
        userId: this.userId,
        topicSetId: this.topicSetId,
        endConditionType: this.endConditionType,
        endConditionValue: this.endConditionValue,
        correctKeyCount: this.correctKeyCount,
        durationSeconds: this.durationSeconds,
        keystrokeIntervalsMs: [...this.keystrokeIntervalsMs],
        missRecords: [...this.missRecords],
        kanaCounts: [...this.kanaCounts.values()],
      }
    },

    /** 送信・再送の両方から呼ぶ。成功時のみ一時ログを破棄する(class-design.md 2.4「送信失敗時の再送」) */
    async submit(): Promise<void> {
      if (this.lastSubmission === null) return
      this.isSubmitting = true
      this.submitError = false
      try {
        this.result = await submitSession(this.lastSubmission)
        this.lastSubmission = null
        this.clearLog()
      } catch {
        this.submitError = true
      } finally {
        this.isSubmitting = false
      }
    },

    clearLog() {
      this.correctKeyCount = 0
      this.missRecords = []
      this.keystrokeIntervalsMs = []
      this.kanaCounts = new Map()
      this.confirmedSentenceCount = 0
      this.kanaOccurrenceCounters = new Map()
      this.currentOccurrenceNo = null
      this.lastMoraIndex = null
      this.firstKeystrokeAt = null
      this.lastKeystrokeAt = null
      this.endedAt = null
    },
  },
})
