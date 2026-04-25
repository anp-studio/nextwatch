<template>
  <div class="p-4 pt-6 pb-20 text-gray-900 dark:text-white h-full overflow-y-auto">
    <NuxtLink
      to="/profile"
      class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-500 transition-colors mb-6"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Profile
    </NuxtLink>
    <div class="flex justify-between items-end mb-4">
      <h1 class="text-3xl font-bold">Watched Movies</h1>
      <span class="text-gray-400 text-sm">
        <template v-if="hasActiveFilters">
          {{ filteredMovies.length }} of {{ watchedMovies.length }} movies
        </template>
        <template v-else>
          {{ watchedMovies.length }} movies
        </template>
      </span>
    </div>

    <div v-if="watchedMovies.length === 0" class="text-center text-gray-500 mt-20">
      <p>You haven't marked any movies yet.</p>
      <NuxtLink to="/" class="text-red-500 mt-2 inline-block">Go to Home</NuxtLink>
    </div>

    <template v-else>
      <div class="relative w-full shadow-sm rounded-2xl overflow-hidden mb-3">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search your movies..."
          class="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-800 border-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium outline-none rounded-2xl"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-wrap gap-2 mb-3">
        <div class="relative dropdown-wrapper">
          <button
            @click="toggleDropdown('genre')"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
            :class="selectedGenres.length > 0
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2m0 2a2 2 0 110 4m0-4a2 2 0 100 4m10-4V2m0 2a2 2 0 110 4m0-4a2 2 0 100 4m-6 8v2m0-2a2 2 0 110-4m0 4a2 2 0 100-4" />
            </svg>
            Genre
            <span v-if="selectedGenres.length > 0" class="bg-white/20 rounded-full px-1.5 text-xs">
              {{ selectedGenres.length }}
            </span>
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="showGenreDropdown"
            class="absolute z-30 mt-1 left-0 w-56 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              v-for="genre in availableGenres"
              :key="genre"
              @click="toggleGenre(genre)"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span
                class="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                :class="selectedGenres.includes(genre)
                  ? 'bg-rose-500 border-rose-500'
                  : 'border-gray-300 dark:border-gray-600'"
              >
                <svg v-if="selectedGenres.includes(genre)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span class="text-gray-700 dark:text-gray-300">{{ genre }}</span>
            </button>
            <div v-if="availableGenres.length === 0" class="px-3 py-2 text-sm text-gray-400">
              {{ isLoadingMetadata ? 'Loading genres...' : 'No genres available' }}
            </div>
          </div>
        </div>

        <div class="relative dropdown-wrapper">
          <button
            @click="toggleDropdown('length')"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
            :class="selectedRuntime
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ selectedRuntime ? selectedRuntime.label : 'Length' }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="showLengthDropdown"
            class="absolute z-30 mt-1 left-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              @click="selectedRuntime = null; openDropdown = null"
              class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="!selectedRuntime ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
            >
              Any length
            </button>
            <button
              v-for="range in RUNTIME_RANGES"
              :key="range.label"
              @click="selectedRuntime = range; openDropdown = null"
              class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="selectedRuntime?.label === range.label ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

        <div class="relative dropdown-wrapper">
          <button
            @click="toggleDropdown('sort')"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
            :class="sortBy !== 'default'
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {{ sortLabels[sortBy] || 'Sort' }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="showSortDropdown"
            class="absolute z-30 mt-1 right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              v-for="(label, key) in sortLabels"
              :key="key"
              @click="sortBy = key as SortOption; openDropdown = null"
              class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="sortBy === key ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-3 py-2 text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div v-if="selectedGenres.length > 0" class="flex flex-wrap gap-1.5 mb-3">
        <span
          v-for="genre in selectedGenres"
          :key="genre"
          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full"
        >
          {{ genre }}
          <button @click="toggleGenre(genre)" class="hover:text-rose-900 dark:hover:text-rose-100">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      </div>

      <div v-if="isLoadingMetadata" class="mb-3">
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading movie details for filtering... {{ metadataProgress.loaded }}/{{ metadataProgress.total }}
        </div>
        <div class="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-rose-500 rounded-full transition-all duration-300"
            :style="{ width: metadataProgress.total > 0 ? `${(metadataProgress.loaded / metadataProgress.total) * 100}%` : '0%' }"
          />
        </div>
      </div>

      <div
        v-if="filteredMovies.length === 0 && watchedMovies.length > 0"
        class="text-center text-gray-500 dark:text-gray-400 py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 mt-4"
      >
        <p>No movies match your filters.</p>
        <button @click="clearFilters" class="text-rose-500 mt-2 inline-block hover:underline">
          Clear filters
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="movie in filteredMovies"
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
            <div v-if="getMovieGenres(movie).length > 0" class="flex flex-wrap gap-1 mt-1.5">
              <span
                v-for="genre in getMovieGenres(movie).slice(0, 3)"
                :key="genre"
                class="px-2 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full"
              >
                {{ genre }}
              </span>
            </div>
          </div>
          <button
            @click.stop="handleRemove(movie)"
            class="self-center flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-2"
            title="Remove from watched"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-full px-5 py-3 shadow-lg border border-gray-200 dark:border-transparent flex items-center gap-3 max-w-sm"
      >
        <span class="text-sm truncate">
          <strong>{{ undoAction.movie.title }}</strong> removed from Watched
        </span>
        <button
          @click="handleUndo"
          class="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-semibold text-sm whitespace-nowrap transition-colors"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Movie, WatchedMovie } from '~/types/movie'
import type { SortOption } from '~/composables/useWatchedFilters'

const { watchedMovies, removeFromWatched, markAsWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()
const selectedMovie = ref<Movie | null>(null)

const {
  searchQuery,
  selectedGenres,
  selectedRuntime,
  sortBy,
  availableGenres,
  filteredMovies,
  hasActiveFilters,
  isLoadingMetadata,
  metadataProgress,
  clearFilters,
  toggleGenre,
  fetchMissingMetadata,
  RUNTIME_RANGES,
} = useWatchedFilters(watchedMovies)

type DropdownName = 'genre' | 'length' | 'sort'
const openDropdown = ref<DropdownName | null>(null)
const showGenreDropdown = computed(() => openDropdown.value === 'genre')
const showLengthDropdown = computed(() => openDropdown.value === 'length')
const showSortDropdown = computed(() => openDropdown.value === 'sort')
const toggleDropdown = (name: DropdownName) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const sortLabels: Record<SortOption, string> = {
  'default': 'Default',
  'title-asc': 'Title A–Z',
  'title-desc': 'Title Z–A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

const closeDropdowns = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.dropdown-wrapper')) {
    openDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdowns)
  if (watchedMovies.value.length > 0) {
    fetchMissingMetadata()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
})

watch(() => watchedMovies.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    fetchMissingMetadata()
  }
})

const getMovieGenres = (movie: { tmdbId: number; genres?: string[] }): string[] => {
  return movie.genres ?? []
}

const undoAction = ref<{ movie: WatchedMovie } | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | null = null

const dismissUndo = () => {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction.value = null
}

const handleRemove = async (movie: WatchedMovie) => {
  dismissUndo()
  await removeFromWatched(movie.tmdbId)
  undoAction.value = { movie: { ...movie } }
  undoTimer = setTimeout(dismissUndo, 5000)
}

const handleUndo = async () => {
  const action = undoAction.value
  if (!action) return
  dismissUndo()
  await markAsWatched({
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
  }
}
</script>
