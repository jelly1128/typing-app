import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from './HomeView.vue'
import { useUserStore } from '../stores/userStore'
import * as topicSetApi from '../api/topicSetApi'

describe('HomeView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.spyOn(topicSetApi, 'listTopicSets').mockResolvedValue([
      { id: 1, name: '初級', description: null },
      { id: 2, name: '上級', description: null },
    ])
  })

  it('マウント時にお題セット一覧を取得し、現在の名前を表示する', async () => {
    const userStore = useUserStore()
    userStore.setUser({ id: 1, name: 'kazuki' })
    const wrapper = mount(HomeView)
    await flushPromises()

    expect(wrapper.text()).toContain('kazuki')
    expect(wrapper.text()).toContain('初級')
    expect(wrapper.text()).toContain('上級')
  })

  it('お題セット取得失敗時は汎用エラー表示に切り替える(NFR-09)', async () => {
    vi.spyOn(topicSetApi, 'listTopicSets').mockRejectedValue(new Error('server error'))
    const wrapper = mount(HomeView)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
  })

  it('開始ボタン押下でstartイベントを選択内容付きでemitする', async () => {
    const wrapper = mount(HomeView)
    await flushPromises()

    const startButton = wrapper.findAll('button').find((b) => b.text() === '開始')!
    await startButton.trigger('click')

    expect(wrapper.emitted('start')).toEqual([[{ topicSetId: 1, endConditionType: 'sentence_count', endConditionValue: 10 }]])
  })

  it('別の名前で始めるを押すとuserStoreをクリアしchangeNameをemitする', async () => {
    const userStore = useUserStore()
    userStore.setUser({ id: 1, name: 'kazuki' })
    const wrapper = mount(HomeView)
    await flushPromises()

    const changeNameButton = wrapper.findAll('button').find((b) => b.text() === '別の名前で始める')!
    await changeNameButton.trigger('click')

    expect(userStore.userId).toBeNull()
    expect(wrapper.emitted('changeName')).toHaveLength(1)
  })
})
