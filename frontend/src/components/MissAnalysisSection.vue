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
  <section>
    <h2>{{ title }}</h2>
    <p v-if="items.length === 0">分析にはある程度の練習記録が必要です</p>
    <ul v-else>
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>
