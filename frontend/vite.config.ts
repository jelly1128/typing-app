import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    // e2e/はPlaywright(`npm run test:e2e`)専用。Vitestの対象に混ぜると`@playwright/test`のtest/expectが
    // Vitest側と衝突して実行時エラーになる
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
