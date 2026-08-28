<script setup lang="ts">
import { onMounted } from 'vue'
import { useHelloStore } from './stores/hello'

const hello = useHelloStore()
onMounted(() => hello.fetchMessage())
</script>

<template>
  <p>{{ hello.message || 'Loading...' }}</p>
</template>
