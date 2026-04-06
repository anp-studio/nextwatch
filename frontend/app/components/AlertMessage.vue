<template>
  <div
    v-if="message"
    :class="type === 'error'
      ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400'"
    class="p-3 rounded-xl text-sm font-medium text-center"
  >
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps<{ type: 'error' | 'success'; message: string }>()
</script>
