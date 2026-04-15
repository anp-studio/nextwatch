<template>
  <div class="w-full h-full flex flex-col gap-4">
    <div
      class="relative flex-1 min-h-0 rounded-2xl overflow-hidden shadow-md bg-gray-900 cursor-pointer"
      @click="openDetails"
    >
      <img
        :src="movie.image"
        alt="Movie Poster"
        class="absolute inset-0 w-full h-full object-cover"
      />

      <div
        class="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-0"
      ></div>

      <div
        class="absolute bottom-0 left-0 w-full p-4 sm:p-6 text-white z-10 pointer-events-none"
      >
        <h1 class="text-3xl font-bold flex items-baseline gap-2 line-clamp-2 drop-shadow-md">
          {{ movie.title }} <span class="text-xl font-normal opacity-80">{{ movie.year }}</span>
        </h1>
        <div class="flex items-center gap-2 mt-2 text-sm opacity-90 drop-shadow-md">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            ></path>
          </svg>
          <span>{{ movie.genre }}</span>
        </div>
        <div
          v-if="movie.director"
          class="flex items-center gap-2 mt-1 text-sm opacity-90 drop-shadow-md"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            ></path>
          </svg>
          <span>Dir. {{ movie.director }}</span>
        </div>
      </div>
    </div>

    <div class="flex justify-center items-center gap-4 sm:gap-6 shrink-0">
      <button
        @click.stop="$emit('dislike', movie)"
        class="btn-press w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-red-500 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-gray-700 shadow-md"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <button
        @click.stop="$emit('watched', movie)"
        class="btn-press w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow-xl"
      >
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          ></path>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          ></path>
        </svg>
      </button>

      <button
        @click.stop="$emit('to-watch', movie)"
        class="btn-press w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-green-500 dark:hover:text-green-400 transition-all border border-gray-200 dark:border-gray-700 shadow-md"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          ></path>
        </svg>
      </button>

      <button
        @click.stop="$emit('refresh')"
        aria-label="Refresh list"
        title="Refresh list"
        class="btn-press w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-rose-500 dark:hover:text-rose-400 transition-all border border-gray-200 dark:border-gray-700 shadow-md"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          ></path>
        </svg>
      </button>
    </div>

    <MovieDetails :is-open="isDetailsOpen" :movie="detailedMovie" @close="closeDetails" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  movie: {
    type: Object,
    required: true,
  },
})

defineEmits(['dislike', 'watched', 'to-watch', 'refresh'])

const { getMovieDetails } = useMovieDetails()

const isDetailsOpen = ref(false)
const detailedMovie = ref(null)

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
