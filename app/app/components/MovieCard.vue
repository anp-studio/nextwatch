<template>
  <div
    class="[container-type:inline-size] flex h-full min-h-0 w-full flex-col justify-center gap-[clamp(0.25rem,3.5cqw,1rem)]"
  >
    <div class="relative w-full shrink-0 aspect-[1/1.5]">
      <div
        v-if="posterStackCount >= 2"
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-[rgb(82_82_91/0.9)] bg-zinc-900 opacity-30 [box-shadow:0_10px_26px_rgb(0_0_0/0.2),0_0_0_1px_rgb(255_255_255/0.03)] [transform:translateX(-0.55rem)_rotate(-1.6deg)]"
        aria-hidden="true"
      ></div>
      <div
        v-if="posterStackCount >= 1"
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-[rgb(82_82_91/0.9)] bg-zinc-900 opacity-40 [box-shadow:0_10px_26px_rgb(0_0_0/0.2),0_0_0_1px_rgb(255_255_255/0.03)] [transform:translateX(0.55rem)_rotate(1.4deg)]"
        aria-hidden="true"
      ></div>

      <div
        class="relative z-10 w-full shrink-0 aspect-[1/1.5] cursor-pointer overflow-hidden rounded-[1.125rem] border border-zinc-800 bg-zinc-900 shadow-glow"
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
            class="flex h-[clamp(1.2rem,8.7cqw,2rem)] w-[clamp(1.2rem,8.7cqw,2rem)] items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
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
            class="flex h-[clamp(1.2rem,8.7cqw,2rem)] w-[clamp(1.2rem,8.7cqw,2rem)] items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
            title="In My List"
          >
            <svg
              class="h-4 w-4 text-zinc-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
        </div>

        <div
          class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        ></div>

        <div
          v-if="formattedRating"
          class="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2.5 py-1 text-[clamp(0.68rem,3.8cqw,0.9rem)] font-bold leading-none text-white shadow-lg backdrop-blur-md"
        >
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
          <span class="[text-shadow:0_1px_2px_rgb(0_0_0/0.65)]">{{ formattedRating }}</span>
        </div>
      </div>
    </div>

    <div class="w-full space-y-2">
      <div class="space-y-1">
        <div
          class="mb-[clamp(0.12rem,1.5cqw,0.4rem)] flex items-center justify-between gap-3 pb-[clamp(0.08rem,0.8cqw,0.18rem)]"
        >
          <h1
            class="truncate whitespace-nowrap flex-1 text-[clamp(1.05rem,8.25cqw,1.9rem)] font-bold leading-[1.14] tracking-[-0.03em] text-white"
            :title="movie.title"
          >
            {{ displayedTitle }}
          </h1>
          <span
            v-if="movie.year"
            class="shrink-0 text-[clamp(0.75rem,4.2cqw,0.98rem)] font-medium uppercase leading-none tracking-[0.08em] text-zinc-400 opacity-90"
            >{{ movie.year }}</span
          >
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <span
          v-for="tag in genreTags"
          :key="tag"
          class="rounded-full border border-zinc-800 bg-zinc-900/60 px-[clamp(0.18rem,1.5cqw,0.35rem)] py-[clamp(0.4rem,3.4cqw,0.78rem)] text-[clamp(0.48rem,2.95cqw,0.68rem)] font-semibold tracking-[0.16em] text-zinc-400 [padding-inline:clamp(0.4rem,3.4cqw,0.78rem)] [padding-block:clamp(0.18rem,1.5cqw,0.35rem)]"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div
      class="flex shrink-0 items-center justify-center gap-[clamp(0.25rem,3.5cqw,1rem)] pt-[clamp(0rem,0.35cqw,0.1rem)]"
    >
      <button
        class="btn-press flex h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] items-center justify-center rounded-full border border-zinc-800 bg-black text-zinc-500 transition-all hover:border-white hover:text-white [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
        @click.stop="$emit('dislike', movie)"
      >
        <svg
          class="h-[clamp(0.9rem,6.7cqw,1.55rem)] w-[clamp(0.9rem,6.7cqw,1.55rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <button
        class="btn-press flex h-[clamp(2.7rem,20.4cqw,4.7rem)] w-[clamp(2.7rem,20.4cqw,4.7rem)] items-center justify-center rounded-full text-black transition-all shadow-xl [box-shadow:0_0_0_1px_rgb(255_255_255/0.08),0_10px_24px_rgb(0_0_0/0.22),0_0_22px_rgb(255_255_255/0.08)]"
        :class="isInMyList ? 'bg-zinc-300' : 'bg-white hover:scale-105 hover:bg-zinc-200'"
        @click.stop="$emit('to-watch', movie)"
      >
        <svg
          class="h-[clamp(1.05rem,8.25cqw,1.9rem)] w-[clamp(1.05rem,8.25cqw,1.9rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      <button
        class="btn-press flex h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] items-center justify-center rounded-full border transition-all [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
        :class="
          isWatched
            ? 'border-white bg-white text-black'
            : 'border-zinc-800 bg-black text-zinc-500 hover:border-white hover:text-white'
        "
        @click.stop="$emit('watched', movie)"
      >
        <svg
          class="h-[clamp(1.05rem,8.25cqw,1.9rem)] w-[clamp(1.05rem,8.25cqw,1.9rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
    </div>

    <MovieDetails :is-open="isDetailsOpen" :movie="detailedMovie" @close="closeDetails" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const MAX_RATING = 10
const RATING_PRECISION = 1

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
  posterStackCount: {
    type: Number,
    default: 0,
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
    .slice(0, 3)
})
const formattedRating = computed(() => {
  const rating = props.movie.rating

  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) {
    return null
  }

  return `${rating.toFixed(RATING_PRECISION)}/${MAX_RATING}`
})
const displayedTitle = computed(() => truncateMovieTitle(props.movie.title))

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

const TITLE_MAX_LENGTH = 34

function truncateMovieTitle(title) {
  if (typeof title !== 'string') {
    return ''
  }

  if (title.length <= TITLE_MAX_LENGTH) {
    return title
  }

  return `${title.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
}
</script>
