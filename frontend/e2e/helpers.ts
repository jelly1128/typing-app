import { expect, type Page, type APIRequestContext } from '@playwright/test'

// P6-03/P6-04で共通のテストヘルパー。ST-004以降は「複数セッション蓄積後の画面」を検証する必要があり、
// Playwrightでタイピングを毎回操作すると遅く不安定なため、POST /api/sessionsを直接呼んでデータだけ
// 用意する(実際のタイピング判定ロジック自体はUT/ITで既に検証済み)。

/**
 * テスト間でユーザー名が衝突しないよう、実行のたびに一意な名前を作る
 * @param prefix シナリオを識別する接頭辞(例: "st004")
 * @returns 一意な利用者名
 */
export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * POST /api/usersを呼び、利用者を新規作成する(UI操作を介さないテストデータ準備用)
 * @param request Playwrightのrequestフィクスチャ
 * @param name 利用者名
 * @returns 作成された利用者(id/name)
 */
export async function createUser(request: APIRequestContext, name: string): Promise<{ id: number; name: string }> {
  const res = await request.post('/api/users', { data: { name } })
  expect(res.ok(), `identifyUser failed: ${res.status()}`).toBeTruthy()
  return res.json()
}

/**
 * ページ読み込み前にlocalStorageへuserId/nameを書き込み、名前入力を経由せずログイン済み状態にする
 * @param page 対象のPage
 * @param userId ログインさせる利用者のID(ST-010のように実在しないIDを渡すこともできる)
 * @param name ログインさせる利用者の名前
 * @returns なし(以降のpage.goto()で読み込まれるアプリがuserStore.restoreFromStorage()で復元する)
 */
export async function loginAsUser(page: Page, userId: number, name: string): Promise<void> {
  await page.addInitScript(
    ([id, storedName]) => {
      localStorage.setItem('typingApp.userId', String(id))
      localStorage.setItem('typingApp.name', storedName as string)
    },
    [userId, name],
  )
}

export interface SeedMissRecord {
  kanaOccurrenceNo: number
  kana: string
  expectedKey: string
  actualKey: string
  prevKana?: string | null
  charType: string
}

export interface SeedKanaCount {
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
export async function submitSession(
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
export async function typeRomaji(page: Page, romaji: string): Promise<void> {
  for (const char of romaji) {
    await page.keyboard.press(char)
  }
}
