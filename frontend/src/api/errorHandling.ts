import type { Router } from 'vue-router'
import { ApiError } from './client'
import { useUserStore } from '../stores/userStore'

/**
 * userId系APIが404(USER_NOT_FOUND)を返した場合の共通処理(sequence.md 5.2、ADR-003)。
 * routerは呼び出し元Viewが`useRouter()`で取得したインスタンスを渡す(テストでの差し替えを壊さないため、
 * このモジュール自身はrouterのシングルトンをimportしない)
 * @param error catchブロックで受け取ったエラー
 * @param router 呼び出し元Viewのrouterインスタンス
 * @returns このエラーを処理した(userIdをクリアしS-01へ遷移した)ならtrue。それ以外(呼び出し元で通常のエラー表示を続ける)ならfalse
 */
export function handleUserNotFound(error: unknown, router: Router): boolean {
  if (error instanceof ApiError && error.response.code === 'USER_NOT_FOUND') {
    useUserStore().clearUser()
    router.push({ name: 'name-input' })
    return true
  }
  return false
}

/**
 * エラーがtraceId(NFR-07: レスポンスとログの双方に同じ値を出す)を持つApiErrorであれば取り出す
 * (P3ゲート③ opsレビューC3対応: 問い合わせ時にログと突き合わせる鍵として画面に併記する)
 * @param error catchブロックで受け取ったエラー
 * @returns traceId。ApiErrorでない(ネットワークエラー等)場合はnull
 */
export function getTraceId(error: unknown): string | null {
  return error instanceof ApiError ? error.response.traceId : null
}
