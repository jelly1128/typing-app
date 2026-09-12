import { test, expect } from '@playwright/test'

// P6-01: Playwright導入の疎通確認用。S-01(名前入力画面、backend不要で表示できる)を対象にする
test('S-01 名前入力画面が表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('名前')).toBeVisible()
  await expect(page.getByRole('button', { name: 'はじめる' })).toBeVisible()
})
