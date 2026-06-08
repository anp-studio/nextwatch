<template>
  <header class="z-50 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
    <div
      class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="text-2xl font-black uppercase tracking-[0.35em] text-on-surface transition-colors hover:text-on-surface-variant"
      >
        NEXT
      </NuxtLink>

      <div class="flex items-center gap-2">
        <button
          v-if="isRecommendationRoute"
          class="theme-toggle btn-press inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-primary/40 hover:text-on-surface"
          aria-label="Refresh recommendation feed"
          title="Refresh recommendation feed"
          @click="handleRefreshAction"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <button
          class="btn-press inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-primary/40 hover:text-on-surface"
          aria-label="Open profile"
          title="Open profile"
          @click="navigateTo('/profile')"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const RECOMMENDATION_REFRESH_EVENT = 'recommendation:refresh-request'

const route = useRoute()

const isRecommendationRoute = computed(() => route.path === '/')

const handleRefreshAction = () => {
  window.dispatchEvent(new CustomEvent(RECOMMENDATION_REFRESH_EVENT))
}
</script>
