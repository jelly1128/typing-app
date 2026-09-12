import { test, expect } from '@playwright/test'
import { uniqueName, createUser, loginAsUser, submitSession, typeRomaji } from './helpers'

// P6-04: st-cases.md ST-010〜013(異常系・遷移制御、sequence.md 5章)。
// 着手時、5.2(userId失効時の共通404ハンドラ)が未実装だったことが判明したため、
// frontend/src/api/errorHandling.tsを新規実装してから本ファイルを書いた(CL-028)。

test.describe('ST-010〜013: 異常系・遷移制御(P6-04)', () => {
  test('ST-010 userId失効時の遷移(sequence.md 5.2)', async ({ page }) => {
    // DB上に存在しないuserIdを直接localStorageに仕込み、404発生を再現する
    await loginAsUser(page, 999999999, uniqueName('st010'))
    await page.goto('/history')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByLabel('名前')).toBeVisible()

    // 強制遷移後にlocalStorageもクリアされている(再アクセス時に同じ404を繰り返さないため)
    const storedUserId = await page.evaluate(() => localStorage.getItem('typingApp.userId'))
    expect(storedUserId).toBeNull()
  })

  test('ST-011 起動時のルーターガード(sequence.md 5.3)', async ({ page }) => {
    // localStorageにuserId未設定のまま保護ルートへ直接アクセスする(router/index.test.tsの単体版に対するE2E確認)
    await page.goto('/history')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByLabel('名前')).toBeVisible()
  })

  test('ST-012 送信失敗時の再送(sequence.md 5.1)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st012'))
    await page.getByRole('button', { name: 'はじめる' }).click()

    // POST /api/sessionsの1回目だけ500で失敗させ、2回目(再送)は実バックエンドへ通す
    let submitAttempts = 0
    await page.route('**/api/sessions', async (route) => {
      submitAttempts += 1
      if (submitAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'ST-012 seeded failure',
            traceId: 'e2e-st012',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.locator('input[type="number"]').fill('1')
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page.getByText('1 / 1')).toBeVisible()
    await typeRomaji(page, 'asa')

    await page.waitForURL('**/result')
    await expect(page.getByText('結果の保存に失敗しました')).toBeVisible()

    await page.getByRole('button', { name: 'もう一度送信' }).click()
    await expect(page.locator('dl')).toBeVisible()
    expect(submitAttempts).toBe(2)
  })

  test('ST-013 自己ベストが終了条件をまたぐケース(isNetKpmBestの表示)', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st013'))
    // 極端に遅い基準セッションを1件作り、次に行う実タイピングセッションが確実に自己ベストを更新するようにする
    await submitSession(request, { userId: user.id, topicSetId: 1, correctKeyCount: 1, durationSeconds: 600 })

    await loginAsUser(page, user.id, user.name)
    await page.goto('/home')

    await page.locator('input[type="number"]').fill('1')
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page.getByText('1 / 1')).toBeVisible()
    // durationSeconds=0だとnetKpm=0扱いになり自己ベストを更新できないため(session-metrics.md 2.2)、
    // 最初のキー入力から1秒以上経過させてから打ち終える
    await page.keyboard.press('a')
    await page.waitForTimeout(1100)
    await typeRomaji(page, 'sa')

    await page.waitForURL('**/result')
    // previousBestではなくisNetKpmBestで新記録が示される(screen-design.md 4章)
    await expect(page.getByText('(自己ベスト更新)')).toBeVisible()
  })
})
