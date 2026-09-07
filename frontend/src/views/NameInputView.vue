<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'

const emit = defineEmits<{ identified: [] }>()

const userStore = useUserStore()
const name = ref('')
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

async function handleSubmit() {
  const trimmed = name.value.trim()
  if (trimmed === '') return

  isSubmitting.value = true
  errorMessage.value = null
  try {
    await userStore.identifyUser(trimmed)
    emit('identified')
  } catch {
    errorMessage.value = '読み込みに失敗しました'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <label for="name">名前</label>
    <input id="name" v-model="name" type="text" maxlength="100" required />
    <button type="submit" :disabled="name.trim() === '' || isSubmitting">はじめる</button>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
  </form>
</template>
