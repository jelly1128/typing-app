import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import ResultView from './ResultView.vue'
import { createAppRouter } from '../router'
import { useSessionStore } from '../stores/sessionStore'
import * as sessionApi from '../api/sessionApi'
import type { SessionResult } from '../types/api'

const FAKE_RESULT: SessionResult = {
  sessionId: 1,
  netKpm: 120,
  rawKpm: 130,
  accuracy: 95.5,
  consistency: 42.1,
  durationSeconds: 30,
  playedAt: '2026-09-10T00:00:00Z',
  previousBest: null,
  isNetKpmBest: true,
  isAccuracyBest: false,
}

async function endSessionWith(result: SessionResult | Error) {
  const sessionStore = useSessionStore()
  sessionStore.startSession(1, 1, 'sentence_count', 1)
  if (result instanceof Error) {
    vi.spyOn(sessionApi, 'submitSession').mockRejectedValue(result)
  } else {
    vi.spyOn(sessionApi, 'submitSession').mockResolvedValue(result)
  }
  await sessionStore.endSession()
}

describe('ResultView', () => {
  let router: ReturnType<typeof createAppRouter>

  function mountView() {
    return mount(ResultView, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createAppRouter(createMemoryHistory())
  })

  it('送信成功時は結果と自己ベスト更新の強調表示をする(FR-06, FR-09)', async () => {
    await endSessionWith(FAKE_RESULT)
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('120')
    expect(wrapper.text()).toContain('自己ベスト更新')
  })

  it('送信失敗時はエラー表示と再送ボタンを出す(class-design.md 2.4 送信失敗時の再送)', async () => {
    await endSessionWith(new Error('network error'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('結果の保存に失敗しました')
    expect(wrapper.get('button').text()).toBe('もう一度送信')
  })

  it('再送ボタン押下で同じ内容を再送し、成功すれば結果表示に切り替わる', async () => {
    await endSessionWith(new Error('network error'))
    const wrapper = mountView()
    await flushPromises()

    vi.spyOn(sessionApi, 'submitSession').mockResolvedValue(FAKE_RESULT)
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('120')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('もう一度/履歴を見るボタンでそれぞれhome/historyへ遷移する', async () => {
    await endSessionWith(FAKE_RESULT)
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    await buttons.find((b) => b.text() === 'もう一度')!.trigger('click')
    await buttons.find((b) => b.text() === '履歴を見る')!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'home' })
    expect(pushSpy).toHaveBeenCalledWith({ name: 'history' })
  })
})
