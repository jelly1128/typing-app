import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppRouter } from './index'
import { useUserStore } from '../stores/userStore'

describe('router guard(sequence.md 5.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('userId未設定時、保護ルートへの直接アクセスはname-inputへリダイレクトされる(ST-011)', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push({ name: 'typing' })

    expect(router.currentRoute.value.name).toBe('name-input')
  })

  it('userId設定時は保護ルートへそのまま進める', async () => {
    useUserStore().setUser({ id: 1, name: 'kazuki' })
    const router = createAppRouter(createMemoryHistory())
    await router.push({ name: 'home' })

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('userId未設定時でもname-input自体へはリダイレクトされない', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push({ name: 'name-input' })

    expect(router.currentRoute.value.name).toBe('name-input')
  })

  it('localStorageにuserIdが残っていれば、storeが空でも起動時に復元して保護ルートへ進める', async () => {
    // 別タブ/リロード後を想定: userStoreのstateは空だがlocalStorageには前回のuserIdが残っている
    localStorage.setItem('typingApp.userId', '5')
    localStorage.setItem('typingApp.name', 'kazuki')
    const router = createAppRouter(createMemoryHistory())
    await router.push({ name: 'history' })

    expect(router.currentRoute.value.name).toBe('history')
    expect(useUserStore().userId).toBe(5)
  })
})
