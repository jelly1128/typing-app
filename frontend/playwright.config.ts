import { defineConfig } from '@playwright/test'

/**
 * PlaywrightがバンドルするChromiumのダウンロードがこの環境からタイムアウトするため、
 * `channel: 'chrome'`でOS既存のGoogle Chromeを直接操作する(公式にサポートされている方式、
 * `npx playwright install`は不要)。frontend(`npm run dev`)・backend(`mvn spring-boot:run`)・
 * Docker(PostgreSQL)を事前に起動してから`npm run test:e2e`を実行する(test-plan.md 5章)
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
  },
})
