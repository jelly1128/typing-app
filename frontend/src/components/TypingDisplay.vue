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
  <p class="sentence-text">{{ sentenceText }}</p>
  <p class="romaji">
    <!-- 確定済み文字(緑相当)・今打っている途中の文字・次に打つべき残りのヒント、の3つを横に並べて表示する -->
    <span class="confirmed">{{ keystroke.confirmedText }}</span>
    <span class="pending">{{ keystroke.pendingInput }}</span>
    <span class="hint">{{ keystroke.nextHint }}</span>
  </p>
  <!-- missAtはミスした拍のかな。次に正しいキーが入力されるとnullに戻る(romaji-automaton.md 6.1) -->
  <p v-if="keystroke.missAt" role="alert">ミス: {{ keystroke.missAt }}</p>
</template>
