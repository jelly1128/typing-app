<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTopicStore } from '../stores/topicStore'
import { useSessionStore } from '../stores/sessionStore'
import { useUserStore } from '../stores/userStore'
import { createSequenceJudge } from '../judgment-engine/sequenceJudge'
import type { KeystrokeResult } from '../judgment-engine/types'
import type { EndConditionType } from '../types/api'
import TypingDisplay from '../components/TypingDisplay.vue'

// HomeView の `start` イベントのペイロードをそのまま受け取る想定(router配線前提。P5-18でルートから渡す形に置き換わる)
const props = defineProps<{
  topicSetId: number
  endConditionType: EndConditionType
  endConditionValue: number
}>()

const emit = defineEmits<{
  finished: []
}>()

// useXxxStore() は Pinia の作法: 呼ぶたびに同じストアのインスタンスを返す(シングルトン)。
// judgment-engine は Vue に依存しないただの関数なので、コンポーネントの外の変数と同じ感覚で1つ作って使い回す
const topicStore = useTopicStore()
const sessionStore = useSessionStore()
const userStore = useUserStore()
const judge = createSequenceJudge()

// ref() は「値が変わったら画面を自動で再描画してほしいデータ」に使う(テンプレート側で参照する値はこちらに置く)
const loadError = ref(false)
const currentSentenceIndex = ref(0)
const keystroke = ref<KeystrokeResult | null>(null)
const remainingSeconds = ref<number | null>(null)

// 画面の再描画とは無関係な内部カウンタ・タイマーIDなので、refにせずただの変数で持つ
let confirmedMoraCountInSentence = 0
let timerId: number | undefined
let isFinished = false

// computed() は他の値から自動で計算される値。sentences配列とindexが変わるたびに再計算される
const currentSentence = computed(() => topicStore.sentences[currentSentenceIndex.value])

/**
 * 指定した番号のお題文の判定を開始する(お題文が変わるたびにこの関数を呼び直す)
 * @param index topicStore.sentences内でのお題文の番号(0始まり)
 * @returns なし(keystroke.value等の画面表示用の状態を更新する副作用のみ)
 */
function beginSentence(index: number) {
  currentSentenceIndex.value = index
  confirmedMoraCountInSentence = 0
  // startSentenceの戻り値はお題文表示直後(1打鍵目より前)のヒント(CL-022)
  keystroke.value = judge.startSentence(topicStore.sentences[index].moraList)
}

/**
 * セッションを終える(終了条件達成時に1回だけ呼ばれる)
 * @returns なし(sessionStore.endSession()の完了を待ってから'finished'をemitする)
 */
async function finish() {
  if (isFinished) return // タイマーとキー入力の両方から呼ばれうるため、二重終了を防ぐ
  isFinished = true
  if (timerId !== undefined) window.clearInterval(timerId)
  window.removeEventListener('keydown', handleKeydown)
  await sessionStore.endSession() // 内部でAPI送信まで行う(失敗してもエラー状態を保持したままResultViewへ進む設計)
  emit('finished')
}

/**
 * 1つのお題文が最後まで打ち終わった時に呼ぶ。終了条件を満たしていれば終了、そうでなければ次のお題文へ
 * @returns なし(finish()またはbeginSentence()を呼ぶ副作用のみ)
 */
async function advance() {
  sessionStore.completeSentence()
  if (sessionStore.isSentenceCountConditionMet || sessionStore.hasTimeLimitElapsed()) {
    await finish()
    return
  }
  // お題文が足りなくなったら先頭に戻って再利用する(FR-01「ローテーション/再利用を許容」)
  beginSentence((currentSentenceIndex.value + 1) % topicStore.sentences.length)
}

/**
 * window全体のkeydownイベントのリスナー。ブラウザは「今どの要素にフォーカスがあるか」に関係なく
 * このイベントを毎回発火するので、input欄を使わずキー入力を直接拾う手段として使っている
 * @param event ブラウザが渡すキーボードイベント。押されたキーは`event.key`で取れる
 * @returns なし(keystroke.value等の画面表示用の状態を更新する副作用のみ)
 */
async function handleKeydown(event: KeyboardEvent) {
  if (isFinished || event.key.length !== 1) return // Shift/Tab/矢印キー等(key.lengthが2文字以上)は無視する
  const key = event.key.toLowerCase()
  if (!/^[a-z-]$/.test(key)) return // 判定エンジンが扱うのは英字とハイフン(長音用)のみ

  const result = judge.handleKeystroke(key)
  keystroke.value = result
  sessionStore.recordKeystroke(result)

  if (result.confirmedMora !== null) {
    confirmedMoraCountInSentence += 1
  }
  if (confirmedMoraCountInSentence >= currentSentence.value.moraList.length) {
    await advance()
  }
}

/**
 * setIntervalから200msごとに呼ばれる。time_limitモードは打鍵が無くても時間経過だけで
 * 終了しうるため、監視役として必要
 * @returns なし(remainingSeconds.valueの更新、または終了条件到達時にfinish()を呼ぶ副作用のみ)
 */
function tick() {
  if (isFinished) return
  if (sessionStore.hasTimeLimitElapsed()) {
    finish()
    return
  }
  if (sessionStore.sessionStartedAt !== null) {
    const elapsedSeconds = (Date.now() - sessionStore.sessionStartedAt) / 1000
    remainingSeconds.value = Math.max(0, Math.ceil(props.endConditionValue - elapsedSeconds))
  }
}

// onMounted: このコンポーネントが画面に実際に表示された直後に1回だけ呼ばれる(Vueのライフサイクルフック)。
// API呼び出しやイベント登録など「画面に出てから行いたい処理」をここに書く
onMounted(async () => {
  sessionStore.startSession(userStore.userId!, props.topicSetId, props.endConditionType, props.endConditionValue)
  try {
    await topicStore.selectTopicSet(props.topicSetId)
  } catch {
    loadError.value = true
    return
  }
  if (topicStore.sentences.length === 0) {
    loadError.value = true
    return
  }

  beginSentence(0)
  if (props.endConditionType === 'time_limit') {
    remainingSeconds.value = props.endConditionValue
    timerId = window.setInterval(tick, 200)
  }
  window.addEventListener('keydown', handleKeydown)
})

// onUnmounted: このコンポーネントが画面から消える時に1回だけ呼ばれる。
// onMountedで登録したイベントリスナー・タイマーは、消し忘れるとメモリリークや意図しない多重実行の原因になるためここで必ず解除する
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (timerId !== undefined) window.clearInterval(timerId)
})
</script>

<template>
  <p v-if="loadError" role="alert">読み込みに失敗しました</p>
  <template v-else-if="keystroke">
    <p v-if="endConditionType === 'sentence_count'">{{ sessionStore.confirmedSentenceCount + 1 }} / {{ endConditionValue }}</p>
    <p v-else>残り {{ remainingSeconds }}秒</p>
    <TypingDisplay :sentence-text="currentSentence.text" :keystroke="keystroke" />
  </template>
</template>
