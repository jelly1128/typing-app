import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import MissAnalysisView from './MissAnalysisView.vue'
import { createAppRouter } from '../router'
import { useUserStore } from '../stores/userStore'
import * as missAnalysisApi from '../api/missAnalysisApi'
import type { MissAnalysis } from '../types/api'

const FULL_ANALYSIS: MissAnalysis = {
  byKana: [{ kana: 'し', missCount: 3, occurrenceCount: 10, missRate: 30 }],
  byErrorPattern: [{ expectedKey: 's,sh,c', actualKey: 'x', count: 2 }],
  byPrevKana: [{ prevKana: 'あ', missRate: 25 }],
  byCharType: [{ charType: '清音', occurrenceCount: 10, accuracyRate: 70 }],
  advice: ['「し」を間違えやすい傾向があります。'],
}

const NO_SESSION_ANALYSIS: MissAnalysis = {
  byKana: [],
  byErrorPattern: [],
  byPrevKana: [],
  byCharType: [],
  advice: [],
}

describe('MissAnalysisView', () => {
  let router: ReturnType<typeof createAppRouter>

  function mountView() {
    return mount(MissAnalysisView, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createAppRouter(createMemoryHistory())
    useUserStore().setUser({ id: 1, name: 'kazuki' })
  })

  it('ホームへボタンでhomeへ遷移する(CL-026)', async () => {
    vi.spyOn(missAnalysisApi, 'getMissAnalysis').mockResolvedValue(FULL_ANALYSIS)
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('header button').trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'home' })
  })

  it('4観点とアドバイスを表示する(FR-10, FR-11)', async () => {
    vi.spyOn(missAnalysisApi, 'getMissAnalysis').mockResolvedValue(FULL_ANALYSIS)
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('し: 30%(3/10回)')
    expect(wrapper.text()).toContain('s,sh,c → x: 2回')
    expect(wrapper.text()).toContain('直前があ: 25%')
    expect(wrapper.text()).toContain('清音: 70%')
    expect(wrapper.text()).toContain('「し」を間違えやすい傾向があります。')
  })

  it('セッション自体が0件の場合は4観点すべて空状態、アドバイスは非表示(screen-design.md 4章)', async () => {
    vi.spyOn(missAnalysisApi, 'getMissAnalysis').mockResolvedValue(NO_SESSION_ANALYSIS)
    const wrapper = mountView()
    await flushPromises()

    const placeholders = wrapper.findAll('p').filter((p) => p.text() === '分析にはある程度の練習記録が必要です')
    expect(placeholders).toHaveLength(4)
    expect(wrapper.text()).not.toContain('改善アドバイス')
  })

  it('取得失敗時は汎用エラー表示に切り替える(NFR-09)', async () => {
    vi.spyOn(missAnalysisApi, 'getMissAnalysis').mockRejectedValue(new Error('server error'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
  })
})
