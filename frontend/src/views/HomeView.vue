<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTopicStore } from '../stores/topicStore'
import { useUserStore } from '../stores/userStore'
import { getTraceId } from '../api/errorHandling'
import type { EndConditionType } from '../types/api'

const router = useRouter()
const userStore = useUserStore()
const topicStore = useTopicStore()

const loadError = ref(false)
const loadErrorTraceId = ref<string | null>(null)
const selectedTopicSetId = ref<number | null>(null)
const endConditionType = ref<EndConditionType>('sentence_count')
const endConditionValue = ref(10)

onMounted(async () => {
  try {
    await topicStore.loadTopicSets()
    if (topicStore.topicSets.length > 0) {
      selectedTopicSetId.value = topicStore.topicSets[0].id
    }
  } catch (e) {
    loadError.value = true
    loadErrorTraceId.value = getTraceId(e)
  }
})

// api-spec.yaml POST /api/sessions: sentence_countは1〜50、time_limitは10〜600(秒)
const valueRange = computed(() =>
  endConditionType.value === 'sentence_count' ? { min: 1, max: 50 } : { min: 10, max: 600 },
)

const canStart = computed(
  () =>
    selectedTopicSetId.value !== null &&
    endConditionValue.value >= valueRange.value.min &&
    endConditionValue.value <= valueRange.value.max,
)

function handleStart() {
  if (!canStart.value || selectedTopicSetId.value === null) return
  router.push({
    name: 'typing',
    // route.propsのpropsファンクション(router/index.ts)がクエリ文字列をTypingViewの型付きpropsに変換する
    query: {
      topicSetId: String(selectedTopicSetId.value),
      endConditionType: endConditionType.value,
      endConditionValue: String(endConditionValue.value),
    },
  })
}

function handleChangeName() {
  userStore.clearUser()
  router.push({ name: 'name-input' })
}
</script>

<template>
  <div class="page">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
      <p class="text-lg font-semibold text-slate-900 dark:text-slate-50">{{ userStore.name }} さん</p>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn btn-secondary" @click="router.push({ name: 'history' })">履歴</button>
        <button type="button" class="btn btn-secondary" @click="router.push({ name: 'miss-analysis' })">ミス分析</button>
        <button type="button" class="btn btn-secondary" @click="handleChangeName">別の名前で始める</button>
      </div>
    </header>

    <p v-if="loadError" role="alert" class="text-sm text-red-600 dark:text-red-400">
      読み込みに失敗しました<span v-if="loadErrorTraceId" class="text-xs opacity-75">(エラーコード: {{ loadErrorTraceId }})</span>
    </p>
    <template v-else>
      <fieldset class="card space-y-2">
        <legend class="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">お題セット</legend>
        <label v-for="topicSet in topicStore.topicSets" :key="topicSet.id" class="radio-label">
          <input v-model="selectedTopicSetId" type="radio" :value="topicSet.id" class="h-4 w-4 accent-indigo-600" />
          {{ topicSet.name }}
        </label>
      </fieldset>

      <fieldset class="card space-y-3">
        <legend class="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">終了条件</legend>
        <label class="radio-label">
          <input v-model="endConditionType" type="radio" value="sentence_count" class="h-4 w-4 accent-indigo-600" />
          お題N文
        </label>
        <label class="radio-label">
          <input v-model="endConditionType" type="radio" value="time_limit" class="h-4 w-4 accent-indigo-600" />
          制限時間(秒)
        </label>
        <input
          v-model.number="endConditionValue"
          type="number"
          :min="valueRange.min"
          :max="valueRange.max"
          class="field-input w-32"
        />
      </fieldset>

      <button type="button" class="btn btn-primary self-start" :disabled="!canStart" @click="handleStart">開始</button>
    </template>
  </div>
</template>
