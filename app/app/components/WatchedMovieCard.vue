<template>
  <article class="group flex h-full flex-col gap-3">
    <div
      class="relative aspect-[1/1.5] overflow-hidden rounded-[1.625rem] border border-white/[0.08] bg-[#1c1b1b] transition-transform duration-200 hover:scale-[1.02]"
    >
      <button class="h-full w-full text-left" @click="$emit('open', movie.tmdbId)">
        <img
          :src="posterUrl(movie.posterPath)"
          :alt="movie.title"
          class="h-full w-full object-cover"
        />
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10"
        ></div>
      </button>
      <button
        class="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-[#c4c7c8] backdrop-blur-sm transition hover:border-white/40 hover:text-white"
        title="Remove from watched"
        @click.stop="$emit('remove', movie)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <div class="space-y-2 px-1">
      <div class="space-y-1.5">
        <h2
          class="truncate text-base font-semibold leading-tight text-white sm:text-lg"
          :title="movie.title"
        >
          {{ movie.title }}
        </h2>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#c4c7c8]">
          <span>{{ movie.year }}</span>
          <span>{{ runtimeLabel }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { WatchedMovie } from '~/types/movie'

const FALLBACK_RUNTIME_LABEL = 'Already watched'
const MINUTES_PER_HOUR = 60

const props = defineProps<{
  movie: WatchedMovie
}>()

defineEmits<{
  open: [tmdbId: number]
  remove: [movie: WatchedMovie]
}>()

const runtimeLabel = computed(() => formatRuntimeLabel(props.movie.runtime))

const formatRuntimeLabel = (runtime: WatchedMovie['runtime']) => {
  if (typeof runtime !== 'number' || runtime <= 0) {
    return FALLBACK_RUNTIME_LABEL
  }

  const hours = Math.floor(runtime / MINUTES_PER_HOUR)
  const minutes = runtime % MINUTES_PER_HOUR

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}
</script>
