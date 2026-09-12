import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// P6-03: st-cases.md ST-001〜009。ブラウザ経由の実操作(ST-001〜003)と、API直接呼び出しでの
// テストデータ投入+画面確認(ST-004〜009)を組み合わせる。ST-004以降は「複数セッション蓄積後の画面」を
// 検証する必要があり、Playwrightでタイピングを毎回操作すると遅く不安定なため、POST /api/sessionsを
// 直接呼んでデータだけ用意する(実際のタイピング判定ロジック自体はUT/ITで既に検証済み)。

/**
 * テスト間でユーザー名が衝突しないよう、実行のたびに一意な名前を作る
 * @param prefix シナリオを識別する接頭辞(例: "st004")
 * @returns 一意な利用者名
 */
function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * POST /api/usersを呼び、利用者を新規作成する(UI操作を介さないテストデータ準備用)
 * @param request Playwrightのrequestフィクスチャ
 * @param name 利用者名
 * @returns 作成された利用者(id/name)
 */
async function createUser(request: APIRequestContext, name: string): Promise<{ id: number; name: string }> {
  const res = await request.post('/api/users', { data: { name } })
  expect(res.ok(), `identifyUser failed: ${res.status()}`).toBeTruthy()
  return res.json()
}

/**
 * ページ読み込み前にlocalStorageへuserId/nameを書き込み、名前入力を経由せずログイン済み状態にする
 * @param page 対象のPage
 * @param userId ログインさせる利用者のID
 * @param name ログインさせる利用者の名前
 * @returns なし(以降のpage.goto()で読み込まれるアプリがuserStore.restoreFromStorage()で復元する)
 */
async function loginAsUser(page: Page, userId: number, name: string): Promise<void> {
  await page.addInitScript(
    ([id, storedName]) => {
      localStorage.setItem('typingApp.userId', String(id))
      localStorage.setItem('typingApp.name', storedName as string)
    },
    [userId, name],
  )
}

interface SeedMissRecord {
  kanaOccurrenceNo: number
  kana: string
  expectedKey: string
  actualKey: string
  prevKana?: string | null
  charType: string
}

interface SeedKanaCount {
  kana: string
  charType: string
  totalCount: number
}

/**
 * POST /api/sessionsを呼び、セッション結果を1件保存する(履歴/自己ベスト/ミス分析画面の表示データを準備する)
 * @param request Playwrightのrequestフィクスチャ
 * @param input userId/topicSetIdと、必要に応じたmissRecords/kanaCounts(省略時は空配列)
 * @returns 保存結果(SessionResult)
 */
async function submitSession(
  request: APIRequestContext,
  input: {
    userId: number
    topicSetId: number
    correctKeyCount: number
    durationSeconds: number
    missRecords?: SeedMissRecord[]
    kanaCounts?: SeedKanaCount[]
  },
) {
  const res = await request.post('/api/sessions', {
    data: {
      userId: input.userId,
      topicSetId: input.topicSetId,
      endConditionType: 'sentence_count',
      endConditionValue: 1,
      correctKeyCount: input.correctKeyCount,
      durationSeconds: input.durationSeconds,
      keystrokeIntervalsMs: [200, 210, 190],
      missRecords: input.missRecords ?? [],
      kanaCounts: input.kanaCounts ?? [],
    },
  })
  expect(res.ok(), `submitSession failed: ${res.status()} ${await res.text()}`).toBeTruthy()
  return res.json()
}

/**
 * ローマ字文字列を1文字ずつkeydownイベントとして発火させる(TypingViewはinput欄を使わずwindowのkeydownを直接拾うため)
 * @param page 対象のPage
 * @param romaji 打鍵するローマ字(例: "asa")
 * @returns なし
 */
async function typeRomaji(page: Page, romaji: string): Promise<void> {
  for (const char of romaji) {
    await page.keyboard.press(char)
  }
}

test.describe('ST-001〜009: 主要シナリオ・異常系(P6-03)', () => {
  test('ST-001 ハッピーパス一気通貫(UC-00〜03)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st001'))
    await page.getByRole('button', { name: 'はじめる' }).click()
    await expect(page).toHaveURL(/\/home$/)

    // topicSetId=1(初級)の1文目「あさ」(moraList: あ/さ)のみで完走させる
    await page.locator('input[type="number"]').fill('1')
    await page.getByRole('button', { name: '開始' }).click()
    // TypingViewのonMounted(お題文読み込み)完了前にキー入力するとイベントリスナー未登録で打鍵が失われるため、
    // URL遷移だけでなく画面表示(カウンタ表示)を待ってから打鍵する
    await expect(page.getByText('1 / 1')).toBeVisible()

    await typeRomaji(page, 'asa')
    await page.waitForURL('**/result')
    await expect(page.locator('dl')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toHaveCount(0)
  })

  test('ST-002 お題数モードでのセッション完走', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st002'))
    await page.getByRole('button', { name: 'はじめる' }).click()

    // 2文完走: 「あさ」(asa)→「がっこう」(促音: 次拍この子音kを重ねてgakkou)
    await page.locator('input[type="number"]').fill('2')
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page.getByText('1 / 2')).toBeVisible()

    await typeRomaji(page, 'asa')
    await expect(page.getByText('2 / 2')).toBeVisible()
    await typeRomaji(page, 'gakkou')

    await page.waitForURL('**/result')
    await expect(page.locator('dl')).toBeVisible()
  })

  test('ST-003 制限時間モードでのセッション完走(打鍵途中は破棄)', async ({ page }) => {
    test.setTimeout(20000)
    await page.goto('/')
    await page.getByLabel('名前').fill(uniqueName('st003'))
    await page.getByRole('button', { name: 'はじめる' }).click()

    await page.getByRole('radio', { name: '制限時間(秒)' }).check()
    await page.locator('input[type="number"]').fill('10')
    await page.getByRole('button', { name: '開始' }).click()
    await expect(page).toHaveURL(/\/typing/)

    // 1文字だけ打って1拍未満で放置し、制限時間到達時に破棄されることを確認する
    await page.keyboard.press('a')

    await page.waitForURL('**/result', { timeout: 15000 })
    await expect(page.locator('dl')).toBeVisible()
  })

  test('ST-004 練習履歴閲覧(新しい順)', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st004'))
    await submitSession(request, { userId: user.id, topicSetId: 1, correctKeyCount: 30, durationSeconds: 60 })
    await submitSession(request, { userId: user.id, topicSetId: 1, correctKeyCount: 90, durationSeconds: 60 })

    await loginAsUser(page, user.id, user.name)
    await page.goto('/history')

    const items = page.locator('ul li')
    await expect(items).toHaveCount(2)
    // 新しい順 = 後から送信したセッション(correctKeyCount=90由来のnetKpm)が先頭
    await expect(items.first()).toContainText('90KPM')
    await expect(items.last()).toContainText('30KPM')
  })

  test('ST-005 履歴0件時の表示', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st005'))
    await loginAsUser(page, user.id, user.name)
    await page.goto('/history')

    await expect(page.getByText('まだ記録がありません', { exact: true })).toBeVisible()
  })

  test('ST-006 自己ベスト確認(難易度別・混在しない)', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st006'))
    await submitSession(request, { userId: user.id, topicSetId: 1, correctKeyCount: 60, durationSeconds: 60 })
    await submitSession(request, { userId: user.id, topicSetId: 1, correctKeyCount: 120, durationSeconds: 60 })
    await submitSession(request, { userId: user.id, topicSetId: 2, correctKeyCount: 30, durationSeconds: 60 })

    await loginAsUser(page, user.id, user.name)
    await page.goto('/history')

    // 既定選択は初級(topicSetId=1): 60と120のうちKPM最大の120のみが出る
    await expect(page.getByText(/Net KPM 最大: 120/)).toBeVisible()

    // 中級(topicSetId=2)に切り替えると、初級の120ではなく中級自身の30に更新される(混在しない)
    await page.locator('select').selectOption({ label: '中級' })
    await expect(page.getByText(/Net KPM 最大: 30/)).toBeVisible()
  })

  test('ST-007 自己ベスト0件時の表示', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st007'))
    await loginAsUser(page, user.id, user.name)
    await page.goto('/history')

    await expect(page.getByText('まだ記録がありません。練習を始めましょう')).toBeVisible()
  })

  test('ST-008 ミス傾向分析閲覧(4観点・多い順)', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st008'))
    await submitSession(request, {
      userId: user.id,
      topicSetId: 1,
      correctKeyCount: 20,
      durationSeconds: 30,
      kanaCounts: [
        { kana: 'し', charType: '清音', totalCount: 5 },
        { kana: 'か', charType: '清音', totalCount: 5 },
      ],
      missRecords: [
        { kanaOccurrenceNo: 1, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
        { kanaOccurrenceNo: 2, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
        { kanaOccurrenceNo: 3, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
        { kanaOccurrenceNo: 1, kana: 'か', expectedKey: 'k', actualKey: 't', prevKana: 'い', charType: '清音' },
      ],
    })

    await loginAsUser(page, user.id, user.name)
    await page.goto('/miss-analysis')

    // かな別: しの3回 > かの1回 → 多い順で「し」が先頭
    const byKanaItems = page.locator('section').filter({ has: page.getByRole('heading', { name: 'かな別ミス' }) }).locator('li')
    await expect(byKanaItems.first()).toContainText('し')

    // 誤りパターン別: c,s→t(3回) > k→t(1回) → 多い順で3回が先頭
    const byPatternItems = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: '誤りパターン別' }) })
      .locator('li')
    await expect(byPatternItems.first()).toContainText('3回')
  })

  test('ST-009 改善アドバイス確認', async ({ page, request }) => {
    const user = await createUser(request, uniqueName('st009'))
    await submitSession(request, {
      userId: user.id,
      topicSetId: 1,
      correctKeyCount: 20,
      durationSeconds: 30,
      kanaCounts: [{ kana: 'し', charType: '清音', totalCount: 5 }],
      missRecords: [
        { kanaOccurrenceNo: 1, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
        { kanaOccurrenceNo: 2, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
        { kanaOccurrenceNo: 3, kana: 'し', expectedKey: 'c,s', actualKey: 't', prevKana: 'あ', charType: '清音' },
      ],
    })

    await loginAsUser(page, user.id, user.name)
    await page.goto('/miss-analysis')

    // byErrorPattern[0].count(=3) >= 3 によりpatternテンプレートのアドバイスが1件生成される(advice-generation.md)
    await expect(page.getByRole('heading', { name: '改善アドバイス' })).toBeVisible()
    await expect(page.getByText(/意識してみましょう/)).toBeVisible()
  })
})
