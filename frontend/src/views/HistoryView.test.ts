import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistoryView from './HistoryView.vue'
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
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserStore().setUser({ id: 1, name: 'kazuki' })
    vi.spyOn(topicSetApi, 'listTopicSets').mockResolvedValue(TOPIC_SETS)
    vi.spyOn(sessionApi, 'listSessionHistory').mockResolvedValue(HISTORY)
  })

  it('マウント時に先頭の難易度の自己ベストと履歴一覧を表示する(FR-08, FR-09)', async () => {
    const best: PersonalBest = { topicSetId: 1, netKpmBest: 130, accuracyBest: 96 }
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue(best)
    const wrapper = mount(HistoryView)
    await flushPromises()

    expect(sessionApi.getPersonalBest).toHaveBeenCalledWith(1, 1)
    expect(wrapper.text()).toContain('Net KPM 最大: 130')
    expect(wrapper.text()).toContain('120KPM')
  })

  it('選んだ難易度に自己ベストが無い場合は初回記録メッセージを出す(screen-design.md 4章 B2)', async () => {
    const empty: PersonalBest = { topicSetId: 1, netKpmBest: null, accuracyBest: null }
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue(empty)
    const wrapper = mount(HistoryView)
    await flushPromises()

    expect(wrapper.text()).toContain('まだ記録がありません。練習を始めましょう')
  })

  it('履歴が0件の場合は空状態メッセージを出す(screen-design.md 4章 B2)', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    vi.spyOn(sessionApi, 'listSessionHistory').mockResolvedValue([])
    const wrapper = mount(HistoryView)
    await flushPromises()

    expect(wrapper.text()).toContain('まだ記録がありません')
  })

  it('難易度の選択を変えると自己ベストを取り直す', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    const wrapper = mount(HistoryView)
    await flushPromises()

    await wrapper.get('select').setValue('2')
    await flushPromises()

    expect(sessionApi.getPersonalBest).toHaveBeenLastCalledWith(1, 2)
  })

  it('ホームへ/ミス分析を見るボタンでそれぞれemitする', async () => {
    vi.spyOn(sessionApi, 'getPersonalBest').mockResolvedValue({ topicSetId: 1, netKpmBest: 100, accuracyBest: 90 })
    const wrapper = mount(HistoryView)
    await flushPromises()

    await wrapper.get('header button').trigger('click')
    const buttons = wrapper.findAll('button')
    await buttons.find((b) => b.text() === 'ミス分析を見る')!.trigger('click')

    expect(wrapper.emitted('home')).toHaveLength(1)
    expect(wrapper.emitted('missAnalysis')).toHaveLength(1)
  })
})
