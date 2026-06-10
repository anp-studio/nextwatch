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
            <div class="space-y-2">
              <h1
                class="text-3xl font-semibold uppercase tracking-[-0.04em] text-on-background sm:text-3xl"
              >
                Your Watchlist
              </h1>
            </div>
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
          :total-count="myList.length"
          :is-loading-metadata="isLoadingMetadata"
          :metadata-progress="metadataProgress"
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
          <p class="text-2xl font-semibold text-on-background">Your watchlist is empty</p>
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
          name="watchlist"
          tag="div"
          class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5"
          move-class="transition-transform duration-[280ms] ease-in-out"
          leave-active-class="absolute transition duration-[280ms] ease-in-out"
          leave-to-class="scale-[0.96] opacity-0"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
        >
          <MyListMovieCard
            v-for="(movie, index) in filteredMovies"
            :key="movie.tmdbId"
            :movie="movie"
            :data-index="index"
            @open="openDetails"
            @mark-watched="handleMarkWatched"
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

    <UndoSnackbar :action="undoSnackbar" @undo="handleUndo" />
  </div>
</template>

<script setup lang="ts">
import type { Movie, MyListMovie } from '~/types/movie'

const UNDO_TIMEOUT_MS = 5000

const { myList, removeFromMyList, addToMyList } = useMyList()
const { markAsWatched, removeFromWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()
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
} = useMyListFilters(myList)

const selectedMovie = ref<Movie | null>(null)
const undoAction = ref<{ movie: MyListMovie; type: 'watched' | 'removed' } | null>(null)
const hasMovies = computed(() => myList.value.length > 0)
const hasFilteredMovies = computed(() => filteredMovies.value.length > 0)
const movieCountLabel = computed(() => {
  const count = myList.value.length
  const noun = count === 1 ? 'item' : 'items'

  if (!hasActiveFilters.value) {
    return `${count} ${noun}`
  }

  const filteredCount = filteredMovies.value.length
  return `${filteredCount} of ${count} ${noun}`
})
const undoSnackbar = computed(() => {
  const a = undoAction.value
  if (!a) return null
  return {
    title: a.movie.title,
    message: a.type === 'watched' ? 'marked as watched' : 'removed from watchlist',
  }
})

let undoTimer: ReturnType<typeof setTimeout> | null = null

const dismissUndo = () => {
  if (undoTimer) {
    clearTimeout(undoTimer)
  }

  undoTimer = null
  undoAction.value = null
}

const showUndo = (movie: MyListMovie, type: 'watched' | 'removed') => {
  dismissUndo()
  undoAction.value = { movie: { ...movie }, type }
  undoTimer = setTimeout(dismissUndo, UNDO_TIMEOUT_MS)
}

const handleRemove = async (movie: MyListMovie) => {
  dismissUndo()
  const status = await removeFromMyList(movie.tmdbId)

  if (status !== 'ok') {
    return
  }

  showUndo(movie, 'removed')
}

const handleMarkWatched = async (movie: MyListMovie) => {
  dismissUndo()
  const status = await markAsWatched({
    id: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    poster: movie.posterPath,
  })

  if (status !== 'ok') {
    return
  }

  showUndo(movie, 'watched')
}

const handleUndo = async () => {
  const action = undoAction.value

  if (!action) {
    return
  }

  dismissUndo()

  if (action.type === 'watched') {
    const status = await removeFromWatched(action.movie.tmdbId)

    if (status !== 'ok') {
      return
    }
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
  } catch {}
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
  if (myList.value.length > 0) {
    fetchMissingMetadata()
  }
})

// Refetch detail metadata when new watchlist items arrive so filters stay accurate.
watch(
  () => myList.value.length,
  (newLength, previousLength) => {
    if (newLength > previousLength) {
      fetchMissingMetadata()
    }
  }
)
</script>
