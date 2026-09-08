<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import { useTopicStore } from '../stores/topicStore'
import { useUserStore } from '../stores/userStore'
import { createSequenceJudge } from '../judgment-engine/sequenceJudge'
import type { KeystrokeResult } from '../judgment-engine/types'
import type { EndConditionType } from '../types/api'
import TypingDisplay from '../components/TypingDisplay.vue'

const props = defineProps<{
  topicSetId: number
  endConditionType: EndConditionType
  endConditionValue: number
}>()

const emit = defineEmits<{ finished: [] }>()

const userStore = useUserStore()
const topicStore = useTopicStore()
const sessionStore = useSessionStore()

const loadError = ref(false)
const sentenceIndex = ref(0)
const result = ref<KeystrokeResult | null>(null)
const confirmedCount = ref(0)
const remainingSeconds = ref(props.endConditionValue)

const judge = createSequenceJudge()
let timer: ReturnType<typeof setInterval> | null = null

// FR-01受け入れ条件「全問終了までお題が枯渇しない」: 配列を先頭から使い末尾で戻る(doc-B8)
const currentSentence = computed(() => topicStore.sentences[sentenceIndex.value] ?? null)

onMounted(async () => {
  try {
    await topicStore.selectTopicSet(props.topicSetId)
  } catch {
    loadError.value = true
    return
  }
  if (topicStore.sentences.length === 0 || userStore.userId === null) {
    loadError.value = true
    return
  }

  sessionStore.startSession(userStore.userId, props.topicSetId, props.endConditionType, props.endConditionValue)
  startCurrentSentence()
  window.addEventListener('keydown', handleKeydown)
  if (props.endConditionType === 'time_limit') {
    timer = setInterval(tick, 200)
  }
})

onUnmounted(() => {
  stopListening()
})

function startCurrentSentence() {
  confirmedCount.value = 0
  result.value = null
  judge.startSentence(currentSentence.value!.moraList)
}

function tick() {
  if (sessionStore.hasTimeLimitElapsed()) {
    remainingSeconds.value = 0
    finishSession()
    return
  }
  if (sessionStore.sessionStartedAt !== null) {
    const elapsed = (Date.now() - sessionStore.sessionStartedAt) / 1000
    remainingSeconds.value = Math.max(0, Math.ceil(props.endConditionValue - elapsed))
  }
}

// IMEを介さずキー入力を直接判定する(FR-02)。a-zとー(長音)用のハイフンキーのみ拾う
function handleKeydown(event: KeyboardEvent) {
  if (currentSentence.value === null || sessionStore.isSubmitting) return
  const key = event.key
  if (!/^[a-z-]$/.test(key)) return
  event.preventDefault()

  const r = judge.handleKeystroke(key)
  result.value = r
  sessionStore.recordKeystroke(r)
  if (r.confirmedMora !== null) {
    confirmedCount.value += 1
  }

  if (confirmedCount.value >= currentSentence.value.moraList.length) {
    sessionStore.completeSentence()
    if (sessionStore.isSentenceCountConditionMet) {
      finishSession()
      return
    }
    advanceSentence()
  }
}

function advanceSentence() {
  sentenceIndex.value = (sentenceIndex.value + 1) % topicStore.sentences.length
  startCurrentSentence()
}

function stopListening() {
  window.removeEventListener('keydown', handleKeydown)
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

async function finishSession() {
  stopListening()
  await sessionStore.endSession()
  emit('finished')
}
</script>

<template>
  <p v-if="loadError" role="alert">読み込みに失敗しました</p>
  <template v-else-if="currentSentence">
    <p v-if="endConditionType === 'sentence_count'">{{ sessionStore.confirmedSentenceCount + 1 }} / {{ endConditionValue }}文</p>
    <p v-else>残り{{ remainingSeconds }}秒</p>
    <TypingDisplay
      :sentence-text="currentSentence.text"
      :mora-list="currentSentence.moraList"
      :confirmed-count="confirmedCount"
      :pending-input="result?.pendingInput ?? ''"
      :next-hint="result?.nextHint ?? null"
      :has-miss="result?.missAt !== null && result?.missAt !== undefined"
    />
  </template>
</template>
