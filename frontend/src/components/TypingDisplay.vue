<script setup lang="ts">
import type { KeystrokeResult } from '../judgment-engine/types'

// defineProps: 親(TypingView)から渡されたデータを受け取る宣言。
// このコンポーネント自身は状態を持たず、渡された値をそのまま表示するだけ(class-design.md 2.6)
defineProps<{
  sentenceText: string
  keystroke: KeystrokeResult
}>()
</script>

<template>
  <div class="card w-full max-w-xl space-y-4 text-center">
    <p class="text-2xl font-semibold tracking-wide text-slate-900 dark:text-slate-50">{{ sentenceText }}</p>
    <p class="font-mono text-2xl tracking-wider">
      <!-- 確定済み文字(薄いグレー)・今打っている途中の文字(アクセント色)・次に打つべき残りのヒント(さらに薄いグレー)、の3つを横に並べて表示する -->
      <span class="text-slate-400 dark:text-slate-500">{{ keystroke.confirmedText }}</span>
      <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ keystroke.pendingInput }}</span>
      <span class="text-slate-300 dark:text-slate-600">{{ keystroke.nextHint }}</span>
    </p>
    <!-- missAtはミスした拍のかな。次に正しいキーが入力されるとnullに戻る(romaji-automaton.md 6.1) -->
    <p v-if="keystroke.missAt" role="alert" class="text-sm font-medium text-red-600 dark:text-red-400">
      ミス: {{ keystroke.missAt }}
    </p>
  </div>
</template>
