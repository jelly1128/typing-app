import { defineStore } from 'pinia'
import { identifyUser as identifyUserRequest } from '../api/userApi'
import type { User } from '../types/api'

const STORAGE_KEY_USER_ID = 'typingApp.userId'
const STORAGE_KEY_NAME = 'typingApp.name'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null as number | null,
    name: null as string | null,
  }),
  actions: {
    restoreFromStorage() {
      const storedUserId = localStorage.getItem(STORAGE_KEY_USER_ID)
      const storedName = localStorage.getItem(STORAGE_KEY_NAME)
      if (storedUserId === null || storedName === null) return
      this.userId = Number(storedUserId)
      this.name = storedName
    },
    async identifyUser(name: string): Promise<User> {
      const user = await identifyUserRequest(name)
      this.setUser(user)
      return user
    },
    setUser(user: User) {
      this.userId = user.id
      this.name = user.name
      localStorage.setItem(STORAGE_KEY_USER_ID, String(user.id))
      localStorage.setItem(STORAGE_KEY_NAME, user.name)
    },
    clearUser() {
      this.userId = null
      this.name = null
      localStorage.removeItem(STORAGE_KEY_USER_ID)
      localStorage.removeItem(STORAGE_KEY_NAME)
    },
  },
})
