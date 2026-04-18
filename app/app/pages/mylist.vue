<template>
  <div class="p-4 pt-6 pb-20 text-gray-900 dark:text-white h-full overflow-y-auto">
    <div class="flex justify-between items-end mb-4">
      <h1 class="text-3xl font-bold">My List</h1>
      <span class="text-gray-400 text-sm">{{ myList.length }} movies</span>
    </div>

    <div v-if="myList.length === 0" class="text-center text-gray-500 mt-20">
      <p>You haven't added any movies to your list yet.</p>
      <NuxtLink to="/" class="text-rose-500 mt-2 inline-block">Go to Home</NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="movie in myList"
        :key="movie.tmdbId"
        class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-3 gap-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors"
        @click="openDetails(movie.tmdbId)"
      >
        <img
          :src="posterUrl(movie.posterPath)"
          class="w-20 h-28 object-cover rounded-lg flex-shrink-0"
        />
        <div class="flex flex-col justify-center flex-1 min-w-0">
          <h3 class="font-bold text-lg leading-tight">{{ movie.title }}</h3>
          <p class="text-sm text-gray-400 mt-0.5">{{ movie.year }}</p>
        </div>
        <div class="flex flex-col justify-center gap-2 flex-shrink-0">
          <button
            @click.stop="handleMarkWatched(movie)"
            class="px-3 py-2 text-xs font-semibold border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-full transition-colors flex items-center gap-1"
            title="Mark as Watched"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            Watched
          </button>
          <button
            @click.stop="handleRemove(movie)"
            class="px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
            title="Remove from My List"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Remove
          </button>
        </div>
      </div>
    </div>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 dark:bg-gray-700 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-3 max-w-sm"
      >
        <span class="text-sm truncate">
          <strong>{{ undoAction.movie.title }}</strong>
          {{ undoAction.type === 'watched' ? 'marked as watched' : 'removed from My List' }}
        </span>
        <button
          @click="handleUndo"
          class="text-rose-400 hover:text-rose-300 font-semibold text-sm whitespace-nowrap transition-colors"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Movie, MyListMovie } from '~/types/movie'

const { myList, removeFromMyList, addToMyList } = useMyList()
const { markAsWatched, removeFromWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()
const selectedMovie = ref<Movie | null>(null)
const undoAction = ref<{ movie: MyListMovie; type: 'watched' | 'removed' } | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | null = null

const dismissUndo = () => {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction.value = null
}

const handleRemove = async (movie: MyListMovie) => {
  dismissUndo()
  await removeFromMyList(movie.tmdbId)
  undoAction.value = { movie: { ...movie }, type: 'removed' }
  undoTimer = setTimeout(dismissUndo, 5000)
}

const handleMarkWatched = async (movie: MyListMovie) => {
  dismissUndo()
  await markAsWatched({
    id: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    poster: movie.posterPath,
  })
  undoAction.value = { movie: { ...movie }, type: 'watched' }
  undoTimer = setTimeout(dismissUndo, 5000)
}

const handleUndo = async () => {
  const action = undoAction.value
  if (!action) return
  dismissUndo()

  if (action.type === 'watched') {
    await removeFromWatched(action.movie.tmdbId)
  }

  await addToMyList({
    id: action.movie.tmdbId,
    title: action.movie.title,
    year: action.movie.year,
    poster: action.movie.posterPath,
    genres: action.movie.genres,
    runtime: action.movie.runtime,
  })
}

const openDetails = async (tmdbId: number) => {
  try {
    selectedMovie.value = await fetchMovieDetails(tmdbId)
  } catch {
    // failed to load movie details
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
