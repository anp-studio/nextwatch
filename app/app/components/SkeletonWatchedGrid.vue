<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
    <div
      v-for="n in count"
      :key="n"
      class="aspect-[2/3] rounded-xl skeleton-shimmer"
    ></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 12 })
</script>
