import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from './userStore'
import * as userApi from '../api/userApi'

describe('userStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('setUserでstateとlocalStorageの両方が更新される', () => {
    const store = useUserStore()
    store.setUser({ id: 1, name: 'kazuki' })

    expect(store.userId).toBe(1)
    expect(store.name).toBe('kazuki')
    expect(localStorage.getItem('typingApp.userId')).toBe('1')
    expect(localStorage.getItem('typingApp.name')).toBe('kazuki')
  })

  it('restoreFromStorageはlocalStorageの値をstateへ読み出す', () => {
    localStorage.setItem('typingApp.userId', '2')
    localStorage.setItem('typingApp.name', 'other')

    const store = useUserStore()
    store.restoreFromStorage()

    expect(store.userId).toBe(2)
    expect(store.name).toBe('other')
  })

  it('restoreFromStorageは値が無ければ何もしない', () => {
    const store = useUserStore()
    store.restoreFromStorage()

    expect(store.userId).toBeNull()
    expect(store.name).toBeNull()
  })

  it('clearUserでstateとlocalStorageの両方がクリアされる', () => {
    const store = useUserStore()
    store.setUser({ id: 1, name: 'kazuki' })

    store.clearUser()

    expect(store.userId).toBeNull()
    expect(store.name).toBeNull()
    expect(localStorage.getItem('typingApp.userId')).toBeNull()
    expect(localStorage.getItem('typingApp.name')).toBeNull()
  })

  it('identifyUserはAPIを呼びsetUserと同じ結果になる', async () => {
    vi.spyOn(userApi, 'identifyUser').mockResolvedValue({ id: 3, name: 'new-user' })

    const store = useUserStore()
    const result = await store.identifyUser('new-user')

    expect(result).toEqual({ id: 3, name: 'new-user' })
    expect(store.userId).toBe(3)
    expect(localStorage.getItem('typingApp.userId')).toBe('3')
  })
})
