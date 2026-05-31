<template>
  <article class="group flex h-full flex-col gap-3">
    <button
      class="relative aspect-[1/1.5] overflow-hidden rounded-[1.625rem] border border-outline-variant bg-surface-container-low text-left transition-transform duration-200 hover:scale-[1.02]"
      @click="$emit('open', movie.tmdbId)"
    >
      <img
        :src="posterUrl(movie.posterPath)"
        :alt="movie.title"
        class="h-full w-full object-cover"
      />
      <div
        class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"
      ></div>
    </button>

    <div class="space-y-3 px-1">
      <div class="space-y-1.5">
        <h2
          class="truncate text-base font-semibold leading-tight text-on-background sm:text-lg"
          :title="movie.title"
        >
          {{ movie.title }}
        </h2>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
          <span>{{ movie.year }}</span>
          <span v-if="ratingLabel" class="inline-flex items-center gap-1">
            <svg
              class="h-[clamp(0.72rem,3.9cqw,0.92rem)] w-[clamp(0.72rem,3.9cqw,0.92rem)] text-amber-400 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.45))]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              />
            </svg>
            {{ ratingLabel }}
          </span>
          <span>{{ runtimeLabel }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-on-primary transition-colors hover:bg-primary/90"
          title="Mark as watched"
          @click.stop="$emit('mark-watched', movie)"
        >
          Watched
        </button>
        <button
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-outline transition-colors hover:border-primary/40 hover:text-on-surface"
          title="Remove from watchlist"
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
    </div>
  </article>
</template>

<script setup lang="ts">
import type { MyListMovie } from '~/types/movie'

const UNKNOWN_RUNTIME_LABEL = 'Saved for later'
const MINUTES_PER_HOUR = 60
const MAX_RATING = 10
const RATING_PRECISION = 1

const props = defineProps<{
  movie: MyListMovie
}>()

defineEmits<{
  open: [tmdbId: number]
  'mark-watched': [movie: MyListMovie]
  remove: [movie: MyListMovie]
}>()

const ratingLabel = computed(() => formatRating(props.movie.rating))
const runtimeLabel = computed(() => formatRuntimeLabel(props.movie))

const formatRuntime = (runtime: number) => {
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

const formatRating = (rating: MyListMovie['rating']) => {
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) {
    return null
  }

  return `${rating.toFixed(RATING_PRECISION)}/${MAX_RATING}`
}

const formatRuntimeLabel = (movie: MyListMovie) => {
  if (typeof movie.runtime === 'number' && movie.runtime > 0) {
    return formatRuntime(movie.runtime)
  }

  if (Array.isArray(movie.genres) && movie.genres.length > 0) {
    return movie.genres[0]
  }

  return UNKNOWN_RUNTIME_LABEL
}
</script>
