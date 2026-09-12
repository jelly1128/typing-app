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
  <dl class="card grid w-full max-w-md grid-cols-2 gap-x-6 gap-y-3">
    <dt class="text-sm text-slate-500 dark:text-slate-400">Net KPM</dt>
    <dd
      class="text-right text-lg font-semibold"
      :class="isNetKpmBest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-50'"
    >
      {{ netKpm }}<span v-if="isNetKpmBest" class="ml-1 text-xs font-normal">(自己ベスト更新)</span>
    </dd>
    <dt class="text-sm text-slate-500 dark:text-slate-400">Raw KPM</dt>
    <dd class="text-right text-lg font-semibold text-slate-900 dark:text-slate-50">{{ rawKpm }}</dd>
    <dt class="text-sm text-slate-500 dark:text-slate-400">正確率</dt>
    <dd
      class="text-right text-lg font-semibold"
      :class="isAccuracyBest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-50'"
    >
      {{ accuracy }}%<span v-if="isAccuracyBest" class="ml-1 text-xs font-normal">(自己ベスト更新)</span>
    </dd>
    <dt class="text-sm text-slate-500 dark:text-slate-400">Consistency</dt>
    <dd class="text-right text-lg font-semibold text-slate-900 dark:text-slate-50">{{ consistency }}</dd>
    <dt class="text-sm text-slate-500 dark:text-slate-400">所要時間</dt>
    <dd class="text-right text-lg font-semibold text-slate-900 dark:text-slate-50">{{ durationSeconds }}秒</dd>
  </dl>
</template>
