import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './sessionStore'
import * as sessionApi from '../api/sessionApi'
import type { KeystrokeResult } from '../judgment-engine/types'
import type { SessionResult } from '../types/api'

function keystroke(overrides: Partial<KeystrokeResult>): KeystrokeResult {
  return {
    confirmedText: '',
    pendingInput: '',
    nextHint: null,
    missAt: null,
    currentKana: 'あ',
    moraIndex: 0,
    confirmedMora: null,
    miss: null,
    ...overrides,
  }
}

describe('sessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('拍が確定するとcorrectKeyCountとkanaCountsが積み上がる', () => {
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 3)

    store.recordKeystroke(
      keystroke({
        moraIndex: 0,
        currentKana: 'あ',
        confirmedMora: { kana: 'あ', charType: '清音', acceptedPattern: 'a', moraIndex: 0 },
      }),
    )
    store.recordKeystroke(
      keystroke({
        moraIndex: 1,
        currentKana: 'し',
        confirmedMora: { kana: 'し', charType: '清音', acceptedPattern: 'shi', moraIndex: 1 },
      }),
    )

    expect(store.correctKeyCount).toBe(4)
    expect(store.buildSubmission().kanaCounts).toEqual([
      { kana: 'あ', charType: '清音', totalCount: 1 },
      { kana: 'し', charType: '清音', totalCount: 1 },
    ])
  })

  it('moraIndexが変化するたびにkanaOccurrenceNoが採番され、同一拍内の複数ミスは同じ番号を使う', () => {
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 3)

    store.recordKeystroke(
      keystroke({ moraIndex: 0, currentKana: 'し', miss: { kana: 'し', expectedKey: 's,c', actualKey: 'x', prevKana: null, charType: '清音' } }),
    )
    store.recordKeystroke(
      keystroke({ moraIndex: 0, currentKana: 'し', miss: { kana: 'し', expectedKey: 's,c', actualKey: 'y', prevKana: null, charType: '清音' } }),
    )
    store.recordKeystroke(
      keystroke({ moraIndex: 1, currentKana: 'し', miss: { kana: 'し', expectedKey: 's,c', actualKey: 'z', prevKana: 'し', charType: '清音' } }),
    )

    const missRecords = store.buildSubmission().missRecords
    expect(missRecords[0].kanaOccurrenceNo).toBe(1)
    expect(missRecords[1].kanaOccurrenceNo).toBe(1)
    expect(missRecords[2].kanaOccurrenceNo).toBe(2)
  })

  it('startNewSentence()を挟むと、moraIndexが変化しなくても新しいお題文の最初の拍として採番し直す(REV-014 A1)', () => {
    // 前の文の最後の拍(あ)が確定した直後と、次の文の最初の拍(あ)がまだ未確定の間は
    // moraIndexが同じ値になりうる(class-design.md 2.4、CL-023)。startNewSentence()で
    // lastMoraIndexをリセットしないと、次の文の最初のミスが前の文の採番を使い回してしまう。
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 2)

    store.recordKeystroke(
      keystroke({
        moraIndex: 1,
        currentKana: 'あ',
        confirmedMora: { kana: 'あ', charType: '清音', acceptedPattern: 'a', moraIndex: 0 },
      }),
    )
    store.completeSentence()

    store.startNewSentence()
    store.recordKeystroke(
      keystroke({
        moraIndex: 1,
        currentKana: 'あ',
        miss: { kana: 'あ', expectedKey: 'a', actualKey: 'x', prevKana: 'あ', charType: '清音' },
      }),
    )

    const missRecords = store.buildSubmission().missRecords
    expect(missRecords[0].kanaOccurrenceNo).toBe(2)
  })

  it('sentence_countモードは確定文数がendConditionValueに達すると終了条件を満たす', () => {
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 2)

    expect(store.isSentenceCountConditionMet).toBe(false)
    store.completeSentence()
    expect(store.isSentenceCountConditionMet).toBe(false)
    store.completeSentence()
    expect(store.isSentenceCountConditionMet).toBe(true)
  })

  it('time_limitモードはセッション開始時刻からendConditionValue秒経過すると終了条件を満たす', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = useSessionStore()
    store.startSession(1, 1, 'time_limit', 60)

    expect(store.hasTimeLimitElapsed()).toBe(false)
    vi.setSystemTime(60_000)
    expect(store.hasTimeLimitElapsed()).toBe(true)
    vi.useRealTimers()
  })

  it('送信成功時はresultを保存し一時ログを破棄する', async () => {
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 1)
    store.recordKeystroke(
      keystroke({ moraIndex: 0, confirmedMora: { kana: 'あ', charType: '清音', acceptedPattern: 'a', moraIndex: 0 } }),
    )

    const fakeResult: SessionResult = {
      sessionId: 1,
      netKpm: 100,
      rawKpm: 100,
      accuracy: 100,
      consistency: 0,
      durationSeconds: 0,
      playedAt: '2026-09-08T00:00:00Z',
      previousBest: null,
      isNetKpmBest: true,
      isAccuracyBest: true,
    }
    vi.spyOn(sessionApi, 'submitSession').mockResolvedValue(fakeResult)

    await store.endSession()

    expect(store.result).toEqual(fakeResult)
    expect(store.submitError).toBe(false)
    expect(store.lastSubmission).toBeNull()
    expect(store.correctKeyCount).toBe(0)
  })

  it('送信失敗時は一時ログを保持しsubmitErrorを立てる。再送はsubmit()で行える', async () => {
    const store = useSessionStore()
    store.startSession(1, 1, 'sentence_count', 1)
    store.recordKeystroke(
      keystroke({ moraIndex: 0, confirmedMora: { kana: 'あ', charType: '清音', acceptedPattern: 'a', moraIndex: 0 } }),
    )

    const submitSpy = vi.spyOn(sessionApi, 'submitSession').mockRejectedValueOnce(new Error('timeout'))
    await store.endSession()

    expect(store.submitError).toBe(true)
    expect(store.lastSubmission).not.toBeNull()
    expect(store.correctKeyCount).toBe(1)

    const fakeResult: SessionResult = {
      sessionId: 1,
      netKpm: 100,
      rawKpm: 100,
      accuracy: 100,
      consistency: 0,
      durationSeconds: 0,
      playedAt: '2026-09-08T00:00:00Z',
      previousBest: null,
      isNetKpmBest: true,
      isAccuracyBest: true,
    }
    submitSpy.mockResolvedValueOnce(fakeResult)
    await store.submit()

    expect(store.result).toEqual(fakeResult)
    expect(store.submitError).toBe(false)
    expect(store.lastSubmission).toBeNull()
  })
})
