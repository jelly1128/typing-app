import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import HistoryView from './HistoryView.vue'
import { createAppRouter } from '../router'
import { useUserStore } from '../stores/userStore'
import * as topicSetApi from '../api/topicSetApi'
import * as sessionApi from '../api/sessionApi'
import type { PersonalBest, SessionSummary, TopicSet } from '../types/api'

const TOPIC_SETS: TopicSet[] = [
  { id: 1, name: '初級', description: null },
  { id: 2, name: '上級', description: null },
]

const HISTORY: SessionSummary[] = [
  {
    id: 1,
    topicSetName: '初級',
    endConditionType: 'sentence_count',
    endConditionValue: 10,
    playedAt: '2026-09-10T00:00:00Z',
    netKpm: 120,
    accuracy: 95,
    durationSeconds: 30,
  },
]

describe('HistoryView', () => {
  let router: ReturnType<typeof createAppRouter>

  function mountView() {
    return mount(HistoryView, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createAppRouter(createMemoryHistory())
    useUserStore().setUser({ id: 1, name: 'kazuki' })
    vi.spyOn(topicSetApi, 'listTopicSets').mockResolvedValue(TOPIC_SETS)
    vi.spyOn(sessionApi, 'listSessionHistory').mockResolvedValue(HISTORY)
  })

  it('マウント時に先頭の難易度の自己ベストと履歴一覧を表示する(FR-08, FR-09)', async () => {
    const best: PersonalBest = { topicSetId: 1, netKpmBest: 130, accuracyBest: 96 }
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue(best)
    const wrapper = mountView()
    await flushPromises()

    expect(sessionApi.getPersonalBest).toHaveBeenCalledWith(1, 1)
    expect(wrapper.text()).toContain('Net KPM 最大: 130')
    expect(wrapper.text()).toContain('120KPM')
  })

  it('選んだ難易度に自己ベストが無い場合は初回記録メッセージを出す(screen-design.md 4章 B2)', async () => {
    const empty: PersonalBest = { topicSetId: 1, netKpmBest: null, accuracyBest: null }
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue(empty)
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('まだ記録がありません。練習を始めましょう')
  })

  it('履歴が0件の場合は空状態メッセージを出す(screen-design.md 4章 B2)', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    vi.spyOn(sessionApi, 'listSessionHistory').mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('まだ記録がありません')
  })

  it('難易度の選択を変えると自己ベストを取り直す', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('select').setValue('2')
    await flushPromises()

    expect(sessionApi.getPersonalBest).toHaveBeenLastCalledWith(1, 2)
  })

  it('自己ベスト取得が失敗しても<select>は表示されたままで、再試行できる(REV-014 B2)', async () => {
    const getPersonalBestSpy = vi
      .spyOn(sessionApi, 'getPersonalBest')
      .mockRejectedValueOnce(new Error('timeout'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.text()).toContain('読み込みに失敗しました')

    getPersonalBestSpy.mockResolvedValueOnce({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    const retryButton = wrapper.findAll('button').find((b) => b.text() === '再試行')!
    await retryButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Net KPM 最大: 100')
  })

  it('難易度を素早く切り替えると、後から発行したリクエストの結果だけを反映する(REV-014 B3)', async () => {
    let resolveFirst: (value: PersonalBest) => void
    const firstPending = new Promise<PersonalBest>((resolve) => {
      resolveFirst = resolve
    })
    const getPersonalBestSpy = vi
      .spyOn(sessionApi, 'getPersonalBest')
      .mockReturnValueOnce(firstPending)
      .mockResolvedValueOnce({ topicSetId: 2, netKpmBest: 200, accuracyBest: 80 })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('select').setValue('2')
    await flushPromises()
    // 難易度2への切り替え(速いレスポンス)が先に反映された後、難易度1(遅いレスポンス)が返ってくる
    resolveFirst!({ topicSetId: 1, netKpmBest: 999, accuracyBest: 99 })
    await flushPromises()

    expect(getPersonalBestSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Net KPM 最大: 200')
    expect(wrapper.text()).not.toContain('999')
  })

  it('ホームへ/ミス分析を見るボタンでそれぞれの画面へ遷移する', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('header button').trigger('click')
    const buttons = wrapper.findAll('button')
    await buttons.find((b) => b.text() === 'ミス分析を見る')!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'home' })
    expect(pushSpy).toHaveBeenCalledWith({ name: 'miss-analysis' })
  })
})
