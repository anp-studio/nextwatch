<template>
  <div class="movie-card flex h-full min-h-0 w-full flex-col">
    <div
      class="movie-card-poster relative cursor-pointer overflow-hidden border border-zinc-800 bg-zinc-900 shadow-glow"
      @click="openDetails"
    >
      <img
        :src="movie.image"
        alt="Movie Poster"
        class="absolute inset-0 h-full w-full object-cover"
      />

      <div
        v-if="isInMyList || isWatched"
        class="absolute right-3 top-3 z-20 flex flex-col gap-1.5"
      >
        <div
          v-if="isWatched"
          class="movie-card-status flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
          title="Already watched"
        >
          <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>

        <div
          v-if="isInMyList"
          class="movie-card-status flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
          title="In My List"
        >
          <svg class="h-4 w-4 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
      </div>

      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
    </div>

    <div class="movie-card-copy space-y-2">
      <div class="space-y-1">
        <h1 class="movie-card-title line-clamp-2 text-white">{{ movie.title }}</h1>
        <div class="movie-card-meta flex items-center gap-2 text-zinc-400">
          <span class="truncate">{{ movie.director || UNKNOWN_DIRECTOR_LABEL }}</span>
          <span class="h-1 w-1 rounded-full bg-zinc-700"></span>
          <span>{{ movie.year }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <span
          v-for="tag in genreTags"
          :key="tag"
          class="movie-card-chip rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div class="movie-card-actions flex shrink-0 items-center justify-center gap-4">
      <button
        class="movie-card-action btn-press flex items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-500 transition-all hover:border-white hover:text-white"
        @click.stop="$emit('dislike', movie)"
      >
        <svg class="movie-card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <button
        class="movie-card-action-primary btn-press flex items-center justify-center rounded-full text-black transition-all shadow-xl"
        :class="isWatched
          ? 'bg-zinc-300'
          : 'bg-white hover:scale-105 hover:bg-zinc-200'"
        @click.stop="$emit('watched', movie)"
      >
        <svg class="movie-card-icon-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>

      <button
        class="movie-card-action btn-press flex items-center justify-center rounded-full border transition-all"
        :class="isInMyList
          ? 'border-white bg-white text-black'
          : 'border-zinc-800 bg-black text-zinc-500 hover:border-white hover:text-white'"
        @click.stop="$emit('to-watch', movie)"
      >
        <svg class="movie-card-icon-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="isInMyList"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M5 13l4 4L19 7"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>

    <MovieDetails :is-open="isDetailsOpen" :movie="detailedMovie" @close="closeDetails" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const UNKNOWN_DIRECTOR_LABEL = 'Unknown creator'

const props = defineProps({
  movie: {
    type: Object,
    required: true,
  },
  isInMyList: {
    type: Boolean,
    default: false,
  },
  isWatched: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['dislike', 'watched', 'to-watch', 'refresh'])

const { getMovieDetails } = useMovieDetails()

const isDetailsOpen = ref(false)
const detailedMovie = ref(null)
const genreTags = computed(() => {
  if (typeof props.movie.genre !== 'string' || props.movie.genre.length === 0) {
    return ['Unknown']
  }

  return props.movie.genre
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean)
})

const openDetails = async () => {
  isDetailsOpen.value = true

  try {
    detailedMovie.value = await getMovieDetails(props.movie.id)
  } catch {
    isDetailsOpen.value = false
  }
}

const closeDetails = () => {
  isDetailsOpen.value = false
  setTimeout(() => {
    detailedMovie.value = null
  }, 300)
}
</script>

<style scoped>
.movie-card {
  container-type: inline-size;
  gap: clamp(0.25rem, 3.5cqw, 1rem);
  justify-content: center;
}

.movie-card-poster {
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 1 / 1.5;
  border-radius: 1.125rem;
}

.movie-card-copy {
  width: 100%;
}

.movie-card-copy > :not([hidden]) ~ :not([hidden]) {
  margin-top: clamp(0.1rem, 1.8cqw, 0.5rem);
}

.movie-card-actions {
  padding-top: clamp(0rem, 0.35cqw, 0.1rem);
  gap: clamp(0.25rem, 3.5cqw, 1rem);
}

.movie-card-title {
  font-size: clamp(1.05rem, 8.25cqw, 1.9rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 700;
}

.movie-card-meta {
  gap: clamp(0.12rem, 1.8cqw, 0.5rem);
  font-size: clamp(0.68rem, 4cqw, 0.92rem);
}

.movie-card-chip {
  padding: clamp(0.18rem, 1.5cqw, 0.35rem) clamp(0.4rem, 3.4cqw, 0.78rem);
  font-size: clamp(0.48rem, 2.95cqw, 0.68rem);
  letter-spacing: 0.16em;
  font-weight: 600;
}

.movie-card-status {
  width: clamp(1.2rem, 8.7cqw, 2rem);
  height: clamp(1.2rem, 8.7cqw, 2rem);
}

.movie-card-action {
  width: clamp(2.1rem, 16.1cqw, 3.7rem);
  height: clamp(2.1rem, 16.1cqw, 3.7rem);
}

.movie-card-action-primary {
  width: clamp(2.7rem, 20.4cqw, 4.7rem);
  height: clamp(2.7rem, 20.4cqw, 4.7rem);
}

.movie-card-icon {
  width: clamp(0.9rem, 6.7cqw, 1.55rem);
  height: clamp(0.9rem, 6.7cqw, 1.55rem);
}

.movie-card-icon-primary {
  width: clamp(1.05rem, 8.25cqw, 1.9rem);
  height: clamp(1.05rem, 8.25cqw, 1.9rem);
}
</style>
