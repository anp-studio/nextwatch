<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
const { initialize } = useAuth()

//load session on app start
onMounted(() => {
  initialize()
})
</script>
