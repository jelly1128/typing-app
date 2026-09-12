<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { getTraceId } from '../api/errorHandling'

const router = useRouter()
const userStore = useUserStore()
const name = ref('')
const errorMessage = ref<string | null>(null)
const errorTraceId = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit() {
  const trimmed = name.value.trim()
  if (trimmed === '') return

  isSubmitting.value = true
  errorMessage.value = null
  try {
    await userStore.identifyUser(trimmed)
    router.push({ name: 'home' })
  } catch (e) {
    errorMessage.value = '読み込みに失敗しました'
    errorTraceId.value = getTraceId(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="page items-center justify-center">
    <form class="card w-full max-w-sm space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1">
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-50">タイピング練習</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">名前を入力してはじめましょう</p>
      </div>
      <div>
        <label for="name" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">名前</label>
        <input id="name" v-model="name" type="text" maxlength="100" required class="field-input" />
      </div>
      <button type="submit" class="btn btn-primary w-full" :disabled="name.trim() === '' || isSubmitting">はじめる</button>
      <p v-if="errorMessage" role="alert" class="text-sm text-red-600 dark:text-red-400">
        {{ errorMessage }}<span v-if="errorTraceId" class="text-xs opacity-75">(エラーコード: {{ errorTraceId }})</span>
      </p>
    </form>
  </div>
</template>
