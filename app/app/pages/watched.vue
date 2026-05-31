<template>
  <div
    class="h-full min-h-0 overflow-y-auto bg-background px-4 pb-24 pt-6 text-on-background sm:px-6 lg:px-8"
  >
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section class="flex flex-col gap-6">
        <div
          class="flex flex-col gap-4 border-l-2 border-primary pl-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="space-y-2">
            <h1 class="text-3xl font-semibold uppercase tracking-[-0.04em] text-on-background sm:text-3xl">
              Watched Movies
            </h1>
          </div>

          <div
            class="inline-flex w-fit items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-on-surface-variant"
          >
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            {{ movieCountLabel }}
          </div>
        </div>

        <MovieFilterBarHorizontal
          v-if="hasMovies"
          :search-query="searchQuery"
          :selected-genres="selectedGenres"
          :selected-runtime="selectedRuntime"
          :sort-by="sortBy"
          :available-genres="availableGenres"
          :runtime-ranges="RUNTIME_RANGES"
          :has-active-filters="hasActiveFilters"
          :filtered-count="filteredMovies.length"
          :total-count="watchedMovies.length"
          :is-loading-metadata="isLoadingMetadata"
          :metadata-progress="metadataProgress"
          :search-placeholder="SEARCH_PLACEHOLDER"
          :sort-labels="WATCHED_SORT_LABELS"
          :sort-modal-title="SORT_MODAL_TITLE"
          @update:search-query="searchQuery = $event"
          @update:selected-runtime="selectedRuntime = $event"
          @update:sort-by="sortBy = $event"
          @toggle-genre="toggleGenre"
          @clear-filters="clearFilters"
        />

        <div
          v-if="!hasMovies"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">Your watched list is empty</p>
          <p class="mx-auto mt-3 max-w-md text-sm text-on-surface-variant">
            Finish a few titles and this archive will start to take shape.
          </p>
          <NuxtLink
            to="/"
            class="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-on-primary transition-colors hover:bg-primary/90"
          >
            Go to Recommendations
          </NuxtLink>
        </div>

        <div
          v-else-if="!hasFilteredMovies"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">No movies match these filters</p>
          <button
            class="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-on-primary transition-colors hover:bg-primary/90"
            @click="clearFilters"
          >
            Clear Filters
          </button>
        </div>

        <TransitionGroup
          v-else
          tag="div"
          class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5"
          move-class="transition-transform duration-[280ms] ease-in-out"
          leave-active-class="absolute transition duration-[280ms] ease-in-out"
          leave-to-class="scale-[0.96] opacity-0"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
        >
          <WatchedMovieCard
            v-for="(movie, index) in displayMovies"
            :key="movie.tmdbId"
            :movie="movie"
            :data-index="index"
            @open="openDetails"
            @remove="handleRemove"
          />
        </TransitionGroup>
      </section>
    </div>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />

    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="undoAction"
        class="fixed left-1/2 top-6 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-full border border-outline-variant bg-surface-container-lowest px-5 py-3 text-on-surface shadow-glow"
      >
        <span class="truncate text-sm">
          <strong>{{ undoAction.movie.title }}</strong>
          removed from watched
        </span>
        <button
          class="whitespace-nowrap text-sm font-semibold text-on-surface transition-colors hover:text-on-surface-variant"
          @click="handleUndo"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Movie, WatchedMovie } from '~/types/movie'
import { WATCHED_SORT_LABELS } from '~/composables/useWatchedFilters'

const SEARCH_PLACEHOLDER = 'Search watched movies...'
const SORT_MODAL_TITLE = 'Sort watched movies'
const UNDO_TIMEOUT_MS = 5000

const { watchedMovies, removeFromWatched, markAsWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()

const {
  searchQuery,
  selectedGenres,
  selectedRuntime,
  sortBy,
  availableGenres,
  filteredMovies,
  getGenres,
  getRuntime,
  hasActiveFilters,
  isLoadingMetadata,
  metadataProgress,
  clearFilters,
  toggleGenre,
  fetchMissingMetadata,
  RUNTIME_RANGES,
} = useWatchedFilters(watchedMovies)

const selectedMovie = ref<Movie | null>(null)
const undoAction = ref<{ movie: WatchedMovie } | null>(null)
const hasMovies = computed(() => watchedMovies.value.length > 0)
const hasFilteredMovies = computed(() => filteredMovies.value.length > 0)
const displayMovies = computed(() => {
  return filteredMovies.value.map((movie) => ({
    ...movie,
    genres: getGenres(movie),
    runtime: getRuntime(movie),
  }))
})
const movieCountLabel = computed(() => {
  const count = watchedMovies.value.length
  const noun = count === 1 ? 'movie' : 'movies'

  if (!hasActiveFilters.value) {
    return `${count} ${noun}`
  }

  return `${filteredMovies.value.length} of ${count} ${noun}`
})

let undoTimer: ReturnType<typeof setTimeout> | null = null

const dismissUndo = () => {
  if (undoTimer) {
    clearTimeout(undoTimer)
  }

  undoTimer = null
  undoAction.value = null
}

const handleRemove = async (movie: WatchedMovie) => {
  dismissUndo()
  const status = await removeFromWatched(movie.tmdbId)

  if (status !== 'ok') {
    return
  }

  undoAction.value = { movie: { ...movie } }
  undoTimer = setTimeout(dismissUndo, UNDO_TIMEOUT_MS)
}

const handleUndo = async () => {
  const action = undoAction.value

  if (!action) {
    return
  }

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
    // Leave the modal closed when details cannot be loaded.
  }
}

const onBeforeEnter = (element: Element) => {
  const htmlElement = element as HTMLElement
  htmlElement.style.opacity = '0'
  htmlElement.style.transform = 'translateY(24px)'
}

const onEnter = (element: Element, done: () => void) => {
  const htmlElement = element as HTMLElement
  const delay = Math.min(Number(htmlElement.dataset.index ?? 0) * 45, 360)

  htmlElement.style.transition = `opacity 280ms ease ${delay}ms, transform 280ms ease ${delay}ms`
  void htmlElement.offsetHeight
  htmlElement.style.opacity = '1'
  htmlElement.style.transform = 'translateY(0)'

  setTimeout(done, 280 + delay)
}

const onLeave = (_element: Element, done: () => void) => {
  done()
}

onMounted(() => {
  if (watchedMovies.value.length > 0) {
    fetchMissingMetadata()
  }
})

watch(
  () => watchedMovies.value.length,
  (newLength, previousLength) => {
    if (newLength > previousLength) {
      fetchMissingMetadata()
    }
  }
)
</script>
