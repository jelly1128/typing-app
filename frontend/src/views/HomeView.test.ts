import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import HomeView from './HomeView.vue'
import { createAppRouter } from '../router'
import { useUserStore } from '../stores/userStore'
import * as topicSetApi from '../api/topicSetApi'

describe('HomeView', () => {
  let router: ReturnType<typeof createAppRouter>

  function mountView() {
    return mount(HomeView, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    router = createAppRouter(createMemoryHistory())
    vi.spyOn(topicSetApi, 'listTopicSets').mockResolvedValue([
      { id: 1, name: '初級', description: null },
      { id: 2, name: '上級', description: null },
    ])
  })

  it('マウント時にお題セット一覧を取得し、現在の名前を表示する', async () => {
    const userStore = useUserStore()
    userStore.setUser({ id: 1, name: 'kazuki' })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('kazuki')
    expect(wrapper.text()).toContain('初級')
    expect(wrapper.text()).toContain('上級')
  })

  it('お題セット取得失敗時は汎用エラー表示に切り替える(NFR-09)', async () => {
    vi.spyOn(topicSetApi, 'listTopicSets').mockRejectedValue(new Error('server error'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
  })

  it('開始ボタン押下で選択内容をクエリに付けてtypingへ遷移する', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    const startButton = wrapper.findAll('button').find((b) => b.text() === '開始')!
    await startButton.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({
      name: 'typing',
      query: { topicSetId: '1', endConditionType: 'sentence_count', endConditionValue: '10' },
    })
  })

  it('別の名前で始めるを押すとuserStoreをクリアしname-inputへ遷移する', async () => {
    const userStore = useUserStore()
    userStore.setUser({ id: 1, name: 'kazuki' })
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    const changeNameButton = wrapper.findAll('button').find((b) => b.text() === '別の名前で始める')!
    await changeNameButton.trigger('click')

    expect(userStore.userId).toBeNull()
    expect(pushSpy).toHaveBeenCalledWith({ name: 'name-input' })
  })

  it('履歴/ミス分析ボタンでそれぞれの画面へ遷移する', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === '履歴')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'ミス分析')!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'history' })
    expect(pushSpy).toHaveBeenCalledWith({ name: 'miss-analysis' })
  })
})
