<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/sessionStore'
import SessionMetricsSummary from '../components/SessionMetricsSummary.vue'

// このコンポーネントはpropsを受け取らない。TypingViewが`endSession()`を呼んだ後にrouter.pushで
// このViewへ遷移する想定で、その時点で結果は既にsessionStoreに入っているため直接読む
const router = useRouter()
const sessionStore = useSessionStore()

/**
 * 「もう一度送信」ボタン押下時に呼ぶ。送信内容(lastSubmission)はsessionStore側が保持しており、
 * 同じ内容をそのまま再送する
 * @returns なし(sessionStore.result/submitErrorを更新する副作用のみ。userId失効時はsessionStore内部で
 * S-01へ強制遷移する)
 */
function retry() {
  sessionStore.submit(router)
}
</script>

<template>
  <div class="page items-center">
    <template v-if="sessionStore.submitError">
      <p role="alert" class="text-sm text-red-600 dark:text-red-400">
        結果の保存に失敗しました<span v-if="sessionStore.submitErrorTraceId" class="text-xs opacity-75">(エラーコード: {{ sessionStore.submitErrorTraceId }})</span>
      </p>
      <button type="button" class="btn btn-primary" :disabled="sessionStore.isSubmitting" @click="retry">もう一度送信</button>
    </template>
    <template v-else-if="sessionStore.result">
      <SessionMetricsSummary
        :net-kpm="sessionStore.result.netKpm"
        :raw-kpm="sessionStore.result.rawKpm"
        :accuracy="sessionStore.result.accuracy"
        :consistency="sessionStore.result.consistency"
        :duration-seconds="sessionStore.result.durationSeconds"
        :is-net-kpm-best="sessionStore.result.isNetKpmBest"
        :is-accuracy-best="sessionStore.result.isAccuracyBest"
      />
      <div class="flex gap-3">
        <button type="button" class="btn btn-primary" @click="router.push({ name: 'home' })">もう一度</button>
        <button type="button" class="btn btn-secondary" @click="router.push({ name: 'history' })">履歴を見る</button>
      </div>
    </template>
  </div>
</template>
