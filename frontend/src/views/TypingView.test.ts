import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import TypingView from './TypingView.vue'
import { createAppRouter } from '../router'
import { useUserStore } from '../stores/userStore'
import * as topicSetApi from '../api/topicSetApi'
import * as sessionApi from '../api/sessionApi'
import type { Sentence, SessionResult } from '../types/api'

const SENTENCES: Sentence[] = [
  { id: 1, text: 'あい', moraList: ['あ', 'い'] },
  { id: 2, text: 'う', moraList: ['う'] },
]

const FAKE_RESULT: SessionResult = {
  sessionId: 1,
  netKpm: 100,
  rawKpm: 100,
  accuracy: 100,
  consistency: 0,
  durationSeconds: 1,
  playedAt: '2026-09-10T00:00:00Z',
  previousBest: null,
  isNetKpmBest: true,
  isAccuracyBest: true,
}

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

describe('TypingView', () => {
  let router: ReturnType<typeof createAppRouter>

  function mountView(options: {
    props: { topicSetId: number; endConditionType: 'sentence_count' | 'time_limit'; endConditionValue: number }
    attachTo?: Element
  }) {
    return mount(TypingView, { ...options, global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    router = createAppRouter(createMemoryHistory())
    useUserStore().setUser({ id: 1, name: 'kazuki' })
    vi.spyOn(topicSetApi, 'listSentences').mockResolvedValue(SENTENCES)
    vi.spyOn(sessionApi, 'submitSession').mockResolvedValue(FAKE_RESULT)
  })

  it('マウント時に最初のお題文と1打鍵目のヒントを表示する(CL-022)', async () => {
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 2 },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('あい')
    expect(wrapper.text()).toContain('a')
    expect(wrapper.text()).toContain('1 / 2')
  })

  it('お題文取得失敗時は汎用エラー表示に切り替える(NFR-09)', async () => {
    vi.spyOn(topicSetApi, 'listSentences').mockRejectedValue(new Error('server error'))
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 2 },
    })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
  })

  it('正しいキー入力で確定済み文字が更新される(FR-02, FR-03)', async () => {
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 2 },
      attachTo: document.body,
    })
    await flushPromises()

    pressKey('a')
    await flushPromises()

    expect(wrapper.text()).toContain('a')
    wrapper.unmount()
  })

  it('誤入力時はミス位置を表示する(FR-04)', async () => {
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 2 },
      attachTo: document.body,
    })
    await flushPromises()

    pressKey('x')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('ミス: あ')
    wrapper.unmount()
  })

  it('sentence_count終了条件を満たすとセッションを送信しresultへ遷移する(FR-05)', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 1 },
      attachTo: document.body,
    })
    await flushPromises()

    pressKey('a')
    pressKey('i')
    await flushPromises()

    expect(sessionApi.submitSession).toHaveBeenCalledOnce()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'result' })
    wrapper.unmount()
  })

  it('time_limit終了条件は制限時間到達で自動的にセッションを終了する(FR-05)', async () => {
    vi.useFakeTimers()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView({
      props: { topicSetId: 1, endConditionType: 'time_limit', endConditionValue: 10 },
      attachTo: document.body,
    })
    await flushPromises()

    vi.advanceTimersByTime(10_500)
    await flushPromises()

    expect(sessionApi.submitSession).toHaveBeenCalledOnce()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'result' })
    wrapper.unmount()
    vi.useRealTimers()
  })
})
