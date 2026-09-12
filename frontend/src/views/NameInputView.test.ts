import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import NameInputView from './NameInputView.vue'
import { createAppRouter } from '../router'
import { useUserStore } from '../stores/userStore'
import * as userApi from '../api/userApi'
import { ApiError } from '../api/client'

describe('NameInputView', () => {
  let router: ReturnType<typeof createAppRouter>

  // router/index.tsのuseRouter()がinject()で取れるよう、テストでもmountのたびに同じrouterを注入する
  function mountView() {
    return mount(NameInputView, { global: { plugins: [router] } })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    router = createAppRouter(createMemoryHistory())
  })

  it('空欄では「はじめる」ボタンが無効化される', () => {
    const wrapper = mountView()
    const button = wrapper.get('button[type="submit"]')

    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('名前を入力して送信するとidentifyUserを呼びホーム画面へ遷移する', async () => {
    vi.spyOn(userApi, 'identifyUser').mockResolvedValue({ id: 1, name: 'kazuki' })
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()

    await wrapper.get('input#name').setValue('kazuki')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const userStore = useUserStore()
    expect(userStore.userId).toBe(1)
    expect(pushSpy).toHaveBeenCalledWith({ name: 'home' })
  })

  it('identifyUser失敗時はエラーメッセージを表示し遷移しない', async () => {
    vi.spyOn(userApi, 'identifyUser').mockRejectedValue(new Error('network error'))
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mountView()

    await wrapper.get('input#name').setValue('kazuki')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('読み込みに失敗しました')
    expect(pushSpy).not.toHaveBeenCalled()
  })

  it('identifyUser失敗がApiErrorの場合、traceIdをエラーコードとして併記する(P3ゲート③ opsレビューC3対応)', async () => {
    vi.spyOn(userApi, 'identifyUser').mockRejectedValue(
      new ApiError({ timestamp: '2026-09-12T00:00:00Z', status: 500, code: 'INTERNAL_ERROR', message: 'boom', traceId: 'trace-123' }),
    )
    const wrapper = mountView()

    await wrapper.get('input#name').setValue('kazuki')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('trace-123')
  })
})
