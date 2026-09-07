<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTopicStore } from '../stores/topicStore'
import { useUserStore } from '../stores/userStore'
import type { EndConditionType } from '../types/api'

const emit = defineEmits<{
  start: [payload: { topicSetId: number; endConditionType: EndConditionType; endConditionValue: number }]
  history: []
  missAnalysis: []
  changeName: []
}>()

const userStore = useUserStore()
const topicStore = useTopicStore()

const loadError = ref(false)
const selectedTopicSetId = ref<number | null>(null)
const endConditionType = ref<EndConditionType>('sentence_count')
const endConditionValue = ref(10)

onMounted(async () => {
  try {
    await topicStore.loadTopicSets()
    if (topicStore.topicSets.length > 0) {
      selectedTopicSetId.value = topicStore.topicSets[0].id
    }
  } catch {
    loadError.value = true
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
  emit('start', {
    topicSetId: selectedTopicSetId.value,
    endConditionType: endConditionType.value,
    endConditionValue: endConditionValue.value,
  })
}

function handleChangeName() {
  userStore.clearUser()
  emit('changeName')
}
</script>

<template>
  <header>
    <p>{{ userStore.name }}</p>
    <button type="button" @click="emit('history')">履歴</button>
    <button type="button" @click="emit('missAnalysis')">ミス分析</button>
    <button type="button" @click="handleChangeName">別の名前で始める</button>
  </header>

  <p v-if="loadError" role="alert">読み込みに失敗しました</p>
  <template v-else>
    <fieldset>
      <legend>お題セット</legend>
      <label v-for="topicSet in topicStore.topicSets" :key="topicSet.id">
        <input v-model="selectedTopicSetId" type="radio" :value="topicSet.id" />
        {{ topicSet.name }}
      </label>
    </fieldset>

    <fieldset>
      <legend>終了条件</legend>
      <label>
        <input v-model="endConditionType" type="radio" value="sentence_count" />
        お題N文
      </label>
      <label>
        <input v-model="endConditionType" type="radio" value="time_limit" />
        制限時間(秒)
      </label>
      <input v-model.number="endConditionValue" type="number" :min="valueRange.min" :max="valueRange.max" />
    </fieldset>

    <button type="button" :disabled="!canStart" @click="handleStart">開始</button>
  </template>
</template>
