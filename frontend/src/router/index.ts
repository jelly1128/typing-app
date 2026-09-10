import { createRouter, createWebHistory, type Router, type RouterHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import NameInputView from '../views/NameInputView.vue'
import HomeView from '../views/HomeView.vue'
import TypingView from '../views/TypingView.vue'
import ResultView from '../views/ResultView.vue'
import HistoryView from '../views/HistoryView.vue'
import MissAnalysisView from '../views/MissAnalysisView.vue'
import type { EndConditionType } from '../types/api'

// screen-design.md 2章の遷移図(S-01〜S-06)どおりのパス設計。name-inputだけがガード対象外(下記参照)
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'name-input', component: NameInputView },
  { path: '/home', name: 'home', component: HomeView },
  {
    path: '/typing',
    name: 'typing',
    component: TypingView,
    // HomeViewが選んだ設定をクエリ文字列で渡す。route.queryは常に文字列なのでここで型変換する
    props: (route) => ({
      topicSetId: Number(route.query.topicSetId),
      endConditionType: route.query.endConditionType as EndConditionType,
      endConditionValue: Number(route.query.endConditionValue),
    }),
  },
  { path: '/result', name: 'result', component: ResultView },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/miss-analysis', name: 'miss-analysis', component: MissAnalysisView },
]

/**
 * router本体を作る。history実装を引数にするのは、本番(createWebHistory)とテスト(createMemoryHistory)で
 * ブラウザのURL/historyを共有させたくないため
 * @param history vue-routerのhistory実装
 * @returns ガード(sequence.md 5.3)を組み込んだRouterインスタンス
 */
export function createAppRouter(history: RouterHistory): Router {
  const router = createRouter({ history, routes })

  // 起動時のuserId復元とルーターガード(sequence.md 5.3)。S-01(名前入力)以外の画面は
  // userIdが無ければ強制的にS-01へ戻す。復元をここで行うことで、main.tsに別途起動処理を持たせずに済む
  router.beforeEach((to) => {
    const userStore = useUserStore()
    if (userStore.userId === null) userStore.restoreFromStorage()
    if (to.name !== 'name-input' && userStore.userId === null) {
      return { name: 'name-input' }
    }
  })

  return router
}

export const router = createAppRouter(createWebHistory())
