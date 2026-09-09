<script setup lang="ts">
// S-04(結果画面)とS-05(履歴画面)の両方から使う想定の表示専用コンポーネント(class-design.md 2.6)。
// 自己ベスト比較の対象はNet KPM・正確率のみ(Consistencyは対象外、logic-spec/session-metrics.md 2.5)
defineProps<{
  netKpm: number
  rawKpm: number
  accuracy: number
  consistency: number
  durationSeconds: number
  isNetKpmBest: boolean
  isAccuracyBest: boolean
}>()
</script>

<template>
  <dl>
    <dt>Net KPM</dt>
    <dd :class="{ best: isNetKpmBest }">{{ netKpm }}<span v-if="isNetKpmBest">(自己ベスト更新)</span></dd>
    <dt>Raw KPM</dt>
    <dd>{{ rawKpm }}</dd>
    <dt>正確率</dt>
    <dd :class="{ best: isAccuracyBest }">{{ accuracy }}%<span v-if="isAccuracyBest">(自己ベスト更新)</span></dd>
    <dt>Consistency</dt>
    <dd>{{ consistency }}</dd>
    <dt>所要時間</dt>
    <dd>{{ durationSeconds }}秒</dd>
  </dl>
</template>
