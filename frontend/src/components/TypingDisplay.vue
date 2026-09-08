<script setup lang="ts">
defineProps<{
  sentenceText: string
  moraList: string[]
  confirmedCount: number
  pendingInput: string
  nextHint: string | null
  hasMiss: boolean
}>()
</script>

<template>
  <p class="sentence-text">{{ sentenceText }}</p>
  <p class="reading">
    <span
      v-for="(kana, i) in moraList"
      :key="i"
      :class="{
        confirmed: i < confirmedCount,
        current: i === confirmedCount,
        miss: i === confirmedCount && hasMiss,
      }"
      >{{ kana }}</span
    >
  </p>
  <p v-if="nextHint !== null" class="hint" :class="{ miss: hasMiss }">
    <span class="pending">{{ pendingInput }}</span
    ><span class="next">{{ nextHint }}</span>
  </p>
</template>
