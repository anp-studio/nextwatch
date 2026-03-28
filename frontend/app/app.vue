<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
const { initialize } = useAuth()

onMounted(() => {
  initialize()
})
</script>
