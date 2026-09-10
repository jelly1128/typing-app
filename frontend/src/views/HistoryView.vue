<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTopicStore } from '../stores/topicStore'
import { useUserStore } from '../stores/userStore'
import { getPersonalBest, listSessionHistory } from '../api/sessionApi'
import type { PersonalBest, SessionSummary } from '../types/api'

const router = useRouter()
const topicStore = useTopicStore()
const userStore = useUserStore()

const topicSetLoadError = ref(false)
const selectedTopicSetId = ref<number | null>(null)
const personalBest = ref<PersonalBest | null>(null)
const personalBestError = ref(false)

const historyLoadError = ref(false)
const sessionHistory = ref<SessionSummary[] | null>(null)

// 直近に発行したリクエストの番号(REV-014 B3対応)。難易度を素早く切り替えた時、後から発行した
// リクエストの結果だけを反映し、遅れて返ってきた古いリクエストの結果を無視するために使う
let personalBestRequestId = 0

/**
 * 難易度選択が変わるたびに、選んだ難易度の自己ベストだけを取り直す
 * @param topicSetId 自己ベストを取得する難易度(お題セット)のID
 * @returns なし(personalBest.value/personalBestError.valueを更新する副作用のみ)
 */
async function loadPersonalBest(topicSetId: number) {
  if (userStore.userId === null) return
  const requestId = ++personalBestRequestId
  personalBestError.value = false
  try {
    const result = await getPersonalBest(userStore.userId, topicSetId)
    if (requestId !== personalBestRequestId) return // より新しいリクエストが発行済みなら古い結果は破棄する
    personalBest.value = result
  } catch {
    if (requestId !== personalBestRequestId) return
    personalBestError.value = true
  }
}

// watchはrefの値が変わるたびに副作用(ここではAPI呼び出し)を実行する仕組み。
// selectedTopicSetIdは<select>のv-modelと双方向で結び付いており、選択が変わるとここが自動的に走る
watch(selectedTopicSetId, (topicSetId) => {
  if (topicSetId !== null) loadPersonalBest(topicSetId)
})

onMounted(async () => {
  try {
    await topicStore.loadTopicSets()
    if (topicStore.topicSets.length > 0) {
      selectedTopicSetId.value = topicStore.topicSets[0].id
    }
  } catch {
    topicSetLoadError.value = true
  }

  if (userStore.userId !== null) {
    try {
      sessionHistory.value = await listSessionHistory(userStore.userId)
    } catch {
      historyLoadError.value = true
    }
  }
})
</script>

<template>
  <header>
    <button type="button" @click="router.push({ name: 'home' })">ホームへ</button>
  </header>

  <section>
    <h2>自己ベスト</h2>
    <p v-if="topicSetLoadError" role="alert">読み込みに失敗しました</p>
    <template v-else>
      <select v-model="selectedTopicSetId">
        <option v-for="topicSet in topicStore.topicSets" :key="topicSet.id" :value="topicSet.id">
          {{ topicSet.name }}
        </option>
      </select>
      <p v-if="personalBestError" role="alert">
        読み込みに失敗しました
        <button type="button" @click="selectedTopicSetId !== null && loadPersonalBest(selectedTopicSetId)">再試行</button>
      </p>
      <template v-else-if="personalBest">
        <p v-if="personalBest.netKpmBest === null">まだ記録がありません。練習を始めましょう</p>
        <p v-else>Net KPM 最大: {{ personalBest.netKpmBest }} / 正確率最大: {{ personalBest.accuracyBest }}%</p>
      </template>
    </template>
  </section>

  <section>
    <h2>履歴一覧</h2>
    <p v-if="historyLoadError" role="alert">読み込みに失敗しました</p>
    <p v-else-if="sessionHistory && sessionHistory.length === 0">まだ記録がありません</p>
    <ul v-else-if="sessionHistory">
      <li v-for="session in sessionHistory" :key="session.id">
        {{ session.playedAt }} / {{ session.topicSetName }} / {{ session.endConditionType }}:{{ session.endConditionValue }} /
        {{ session.netKpm }}KPM / {{ session.accuracy }}% / {{ session.durationSeconds }}秒
      </li>
    </ul>
  </section>

  <button type="button" @click="router.push({ name: 'miss-analysis' })">ミス分析を見る</button>
</template>
