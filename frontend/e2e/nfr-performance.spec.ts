import { test, expect } from '@playwright/test'
import { uniqueName, typeRomaji } from './helpers'

// P6-05: st-cases.md ST-014/015(NFR-01/02)。test-plan.md 2.3節・CL-027で確定した計測方法
// (Playwrightテストコード内performance.now())で計測する。個人学習用途のため厳密な性能試験ではなく
// 「体感確認+簡易計測ログでの目安確認」にとどめる(閾値は本来の目標値50ms/2秒よりゆるく取り、
// ローカル実行のオーバーヘッドで誤検知しないようにする)。

test.describe('ST-014〜015: NFR-01/02計測(P6-05)', () => {
  test('ST-014 NFR-01入力反応性(50ms以内、目安確認)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st014'))
    await page.getByRole('button', { name: 'はじめる' }).click()
    await page.locator('input[type="number"]').fill('1')
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page.getByText('1 / 1')).toBeVisible()

    // keydown発火時刻〜2フレーム後(DOM更新・ペイント完了の近似)の差分をブラウザ内で計測する
    await page.evaluate(() => {
      ;(window as unknown as { __nfr01Samples: number[] }).__nfr01Samples = []
      window.addEventListener(
        'keydown',
        () => {
          const start = performance.now()
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ;(window as unknown as { __nfr01Samples: number[] }).__nfr01Samples.push(performance.now() - start)
            })
          })
        },
        { capture: true },
      )
    })

    await typeRomaji(page, 'asa')
    await page.waitForTimeout(50) // 最後のキーの2フレーム後計測が積まれるのを待つ

    const samples = await page.evaluate(() => (window as unknown as { __nfr01Samples: number[] }).__nfr01Samples)
    const average = samples.reduce((a, b) => a + b, 0) / samples.length
    const max = Math.max(...samples)
    console.log(`ST-014 NFR-01 samples(ms): ${samples.map((s) => s.toFixed(1)).join(', ')} / avg=${average.toFixed(1)} / max=${max.toFixed(1)}`)

    expect(samples.length).toBeGreaterThan(0)
    // 目安確認: 50msの目標に対しローカル実行のオーバーヘッドを見込んだ閾値で、異常な遅延が無いことだけ見る
    expect(average).toBeLessThan(300)
  })

  test('ST-015 NFR-02画面表示速度(2秒以内、目安確認)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st015'))
    await page.getByRole('button', { name: 'はじめる' }).click()
    await expect(page.getByText('お題セット')).toBeVisible()

    await page.locator('input[type="number"]').fill('1')

    // S-02(HomeView)→S-03(TypingView): 「開始」クリック〜お題文表示完了まで
    let start = Date.now()
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page.getByText('1 / 1')).toBeVisible()
    const homeToTyping = Date.now() - start

    await typeRomaji(page, 'asa')
    await page.waitForURL('**/result')
    await expect(page.locator('dl')).toBeVisible()

    // S-04(ResultView)→S-05(HistoryView): 「履歴を見る」クリック〜履歴一覧描画完了まで
    start = Date.now()
    await page.getByRole('button', { name: '履歴を見る' }).click()
    await expect(page.getByRole('heading', { name: '履歴一覧' })).toBeVisible()
    const resultToHistory = Date.now() - start

    console.log(`ST-015 NFR-02: S-02→S-03=${homeToTyping}ms / S-04→S-05=${resultToHistory}ms`)

    // 目安確認: 2秒の目標に対し、コールドスタートを除く通常遷移で明らかな遅延が無いことだけ見る
    expect(homeToTyping).toBeLessThan(2000)
    expect(resultToHistory).toBeLessThan(2000)
  })
})
