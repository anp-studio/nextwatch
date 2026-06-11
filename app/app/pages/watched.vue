<template>
  <div
    v-bind="containerProps"
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
          :runtime-ranges="runtimeRanges"
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

        <div v-else class="min-h-[24rem]">
          <div v-bind="wrapperProps">
            <div
              v-for="row in virtualRows"
              :key="row.data.key"
              class="mb-8 grid gap-x-4 md:mb-10 md:gap-x-6"
              :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }"
            >
              <WatchedMovieCard
                v-for="movie in row.data.items"
                :key="movie.tmdbId"
                :movie="movie"
                @open="openDetails"
                @remove="handleRemove"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />

    <UndoSnackbar :action="undoSnackbar" @undo="handleUndo" />
  </div>
</template>

<script setup lang="ts">
import type { Movie, WatchedMovie } from '~/types/movie'
import { WATCHED_SORT_LABELS } from '~/composables/useFilters'

const SEARCH_PLACEHOLDER = 'Search watched movies...'
const SORT_MODAL_TITLE = 'Sort watched movies'
const UNDO_TIMEOUT_MS = 5000
const WATCHED_ROW_HEIGHT = 420
const DEFAULT_METADATA_PROGRESS = { loaded: 0, total: 0 }

const { watchedMovies, removeFromWatched, markAsWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()

const {
  searchQuery,
  selectedGenres,
  selectedRuntime,
  sortBy,
  availableGenres,
  filteredMovies,
  hasActiveFilters,
  clearFilters,
  toggleGenre,
  runtimeRanges,
} = useFilters(watchedMovies)

const selectedMovie = ref<Movie | null>(null)
const undoAction = ref<{ movie: WatchedMovie } | null>(null)
const hasMovies = computed(() => watchedMovies.value.length > 0)
const hasFilteredMovies = computed(() => filteredMovies.value.length > 0)
const { columnCount, virtualRows, containerProps, wrapperProps } = useVirtualGrid(filteredMovies, {
  getKey: (movie) => movie.tmdbId,
  rowHeight: WATCHED_ROW_HEIGHT,
})
const movieCountLabel = computed(() => {
  const count = watchedMovies.value.length
  const noun = count === 1 ? 'movie' : 'movies'

  if (!hasActiveFilters.value) {
    return `${count} ${noun}`
  }

  return `${filteredMovies.value.length} of ${count} ${noun}`
})
const undoSnackbar = computed(() =>
  undoAction.value
    ? { title: undoAction.value.movie.title, message: 'removed from watched' }
    : null
)
const isLoadingMetadata = computed(() => false)
const metadataProgress = computed(() => DEFAULT_METADATA_PROGRESS)

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
  } catch {}
}
</script>
