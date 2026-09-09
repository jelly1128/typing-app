<script setup lang="ts">
import { useSessionStore } from '../stores/sessionStore'
import SessionMetricsSummary from '../components/SessionMetricsSummary.vue'

const emit = defineEmits<{
  playAgain: []
  history: []
}>()

// このコンポーネントはpropsを受け取らない。TypingViewが`endSession()`を呼んだ後に`finished`をemitして
// このViewへ切り替わる想定で、その時点で結果は既にsessionStoreに入っているため直接読む
const sessionStore = useSessionStore()

/**
 * 「もう一度送信」ボタン押下時に呼ぶ。送信内容(lastSubmission)はsessionStore側が保持しており、
 * 同じ内容をそのまま再送する
 * @returns なし(sessionStore.result/submitErrorを更新する副作用のみ)
 */
function retry() {
  sessionStore.submit()
}
</script>

<template>
  <template v-if="sessionStore.submitError">
    <p role="alert">結果の保存に失敗しました</p>
    <button type="button" :disabled="sessionStore.isSubmitting" @click="retry">もう一度送信</button>
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
    <button type="button" @click="emit('playAgain')">もう一度</button>
    <button type="button" @click="emit('history')">履歴を見る</button>
  </template>
</template>
