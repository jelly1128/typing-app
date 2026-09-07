import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NameInputView from './NameInputView.vue'
import { useUserStore } from '../stores/userStore'
import * as userApi from '../api/userApi'

describe('NameInputView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('空欄では「はじめる」ボタンが無効化される', () => {
    const wrapper = mount(NameInputView)
    const button = wrapper.get('button[type="submit"]')

    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('名前を入力して送信するとidentifyUserを呼びidentifiedをemitする', async () => {
    vi.spyOn(userApi, 'identifyUser').mockResolvedValue({ id: 1, name: 'kazuki' })
    const wrapper = mount(NameInputView)

    await wrapper.get('input#name').setValue('kazuki')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const userStore = useUserStore()
    expect(userStore.userId).toBe(1)
    expect(wrapper.emitted('identified')).toHaveLength(1)
  })

  it('identifyUser失敗時はエラーメッセージを表示しidentifiedをemitしない', async () => {
    vi.spyOn(userApi, 'identifyUser').mockRejectedValue(new Error('network error'))
    const wrapper = mount(NameInputView)

    await wrapper.get('input#name').setValue('kazuki')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
    expect(wrapper.emitted('identified')).toBeUndefined()
  })
})
