<template>
  <div class="h-dvh w-full overflow-hidden bg-background text-on-background">
    <div class="flex h-full w-full flex-col overflow-hidden bg-surface">
      <TopHeader />
      <main class="flex-1 relative overflow-hidden">
        <slot />
      </main>
      <BottomNav v-if="showBottomNav" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const ONBOARDING_ROUTE = '/onboarding'

const route = useRoute()

const showBottomNav = computed(() => route.path !== ONBOARDING_ROUTE)
</script>
