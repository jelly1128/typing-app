import { defineStore } from 'pinia'

export const useHelloStore = defineStore('hello', {
  state: () => ({
    message: '',
  }),
  actions: {
    async fetchMessage() {
      const response = await fetch('/api/hello')
      this.message = await response.text()
    },
  },
})
