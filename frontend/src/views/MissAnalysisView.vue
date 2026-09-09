<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { getMissAnalysis } from '../api/missAnalysisApi'
import type { MissAnalysis } from '../types/api'
import MissAnalysisSection from '../components/MissAnalysisSection.vue'

const userStore = useUserStore()

const loadError = ref(false)
const missAnalysis = ref<MissAnalysis | null>(null)

// 各観点の生データ(数値)を、画面にそのまま出せる1行の文字列に整形する。並び順はAPIが返した順のまま
// (db-access.md 5章で確定済みのORDER BYに従うため、フロント側でのソートは行わない)
const byKana = computed(
  () => missAnalysis.value?.byKana.map((m) => `${m.kana}: ${m.missRate}%(${m.missCount}/${m.occurrenceCount}回)`) ?? [],
)
const byErrorPattern = computed(
  () => missAnalysis.value?.byErrorPattern.map((e) => `${e.expectedKey} → ${e.actualKey}: ${e.count}回`) ?? [],
)
const byPrevKana = computed(() => missAnalysis.value?.byPrevKana.map((p) => `直前が${p.prevKana}: ${p.missRate}%`) ?? [])
const byCharType = computed(() => missAnalysis.value?.byCharType.map((c) => `${c.charType}: ${c.accuracyRate}%`) ?? [])
// advice=[]は「セッション自体が0件」の時のみ(logic-spec/advice-generation.md)。セッションはあるが
// ミスが0件の場合は`good`の1件が必ず入るため、この配列の空判定だけで改善アドバイス欄の出し分けができる
const advice = computed(() => missAnalysis.value?.advice ?? [])

onMounted(async () => {
  if (userStore.userId === null) return
  try {
    missAnalysis.value = await getMissAnalysis(userStore.userId)
  } catch {
    loadError.value = true
  }
})
</script>

<template>
  <p v-if="loadError" role="alert">読み込みに失敗しました</p>
  <template v-else-if="missAnalysis">
    <MissAnalysisSection title="かな別ミス" :items="byKana" />
    <MissAnalysisSection title="誤りパターン別" :items="byErrorPattern" />
    <MissAnalysisSection title="直前のかな別ミス率" :items="byPrevKana" />
    <MissAnalysisSection title="文字種別正解率" :items="byCharType" />
    <section v-if="advice.length > 0">
      <h2>改善アドバイス</h2>
      <ul>
        <li v-for="item in advice" :key="item">{{ item }}</li>
      </ul>
    </section>
  </template>
</template>
