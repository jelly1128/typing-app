<script setup lang="ts">
// ミス分析4観点(かな別/誤りパターン別/直前かな別/文字種別)を共通の見た目で表示する使い回し部品
// (class-design.md 2.6)。表示文字列への整形は呼び出し元(MissAnalysisView)が行い、ここでは
// 「タイトル + 一覧、無ければ空状態文言」というレイアウトだけを持つ
defineProps<{
  title: string
  items: string[]
}>()
</script>

<template>
  <section class="card space-y-2">
    <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ title }}</h2>
    <p v-if="items.length === 0" class="text-sm text-slate-500 dark:text-slate-400">
      分析にはある程度の練習記録が必要です
    </p>
    <ul v-else class="space-y-1 text-sm text-slate-700 dark:text-slate-200">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>
