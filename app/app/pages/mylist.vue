<template>
  <div
    class="h-full min-h-0 overflow-y-auto bg-background px-4 pb-24 pt-6 text-on-background sm:px-6 lg:px-8"
  >
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section class="flex flex-col gap-6">
        <div
          class="flex flex-col gap-4 border-l-2 border-[#ffffff] pl-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="space-y-2">
            <div class="space-y-2">
              <h1
                class="text-3xl font-semibold uppercase tracking-[-0.04em] text-white sm:text-3xl"
              >
                Your Watchlist
              </h1>
            </div>
          </div>

          <div
            class="inline-flex w-fit items-center gap-2 rounded-full border border-[#444748] bg-[#1c1b1b] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-[#c4c7c8]"
          >
            <span class="h-2 w-2 rounded-full bg-white"></span>
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
          class="rounded-[1.75rem] border border-dashed border-[#444748] bg-[#1c1b1b] px-6 py-14 text-center shadow-[0_24px_56px_rgb(0_0_0/0.5)]"
        >
          <p class="text-2xl font-semibold text-white">Your watchlist is empty</p>
          <NuxtLink
            to="/"
            class="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200"
          >
            Go to Recommendations
          </NuxtLink>
        </div>

        <div
          v-else-if="!hasFilteredMovies"
          class="rounded-[1.75rem] border border-dashed border-[#444748] bg-[#1c1b1b] px-6 py-14 text-center shadow-[0_24px_56px_rgb(0_0_0/0.5)]"
        >
          <p class="text-2xl font-semibold text-white">No movies match these filters</p>
          <button
            class="mt-8 inline-flex items-center justify-center rounded-full border border-white/10 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200"
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

    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="undoAction"
        class="fixed left-1/2 top-6 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-800 bg-black px-5 py-3 text-zinc-200 shadow-glow"
      >
        <span class="truncate text-sm">
          <strong>{{ undoAction.movie.title }}</strong>
          {{ undoAction.type === 'watched' ? 'marked as watched' : 'removed from watchlist' }}
        </span>
        <button
          class="whitespace-nowrap text-sm font-semibold text-white transition-colors hover:text-zinc-300"
          @click="handleUndo"
        >
          Undo
        </button>
      </div>
    </Transition>
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
