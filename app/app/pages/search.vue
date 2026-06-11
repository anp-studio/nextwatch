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
            <h1
              class="text-3xl font-semibold uppercase tracking-[-0.04em] text-on-background sm:text-3xl"
            >
              Search Movies
            </h1>
          </div>

          <div
            v-if="searchResults.length > 0"
            class="inline-flex w-fit items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-on-surface-variant"
          >
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            {{ resultCountLabel }}
          </div>
        </div>

        <div
          class="rounded-[1.75rem] border border-outline-variant bg-surface-container-low p-2 shadow-glow"
        >
          <div class="relative">
            <span
              class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-outline"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Find a movie..."
              class="h-12 w-full rounded-[1.35rem] bg-surface-container-high pl-11 pr-11 text-sm font-medium text-on-surface outline-none transition placeholder:text-outline focus:ring-1 focus:ring-primary/30"
              @input="handleInput"
            />
            <button
              v-if="searchResults.length > 0"
              type="button"
              class="absolute inset-y-0 right-4 flex items-center text-outline transition hover:text-on-surface"
              @click="clearSearch"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <MovieFilterBarHorizontal
            v-if="searchResults.length > 0"
            class="mt-2"
            :search-query="searchQuery"
            :selected-genres="selectedGenres"
            :selected-runtime="selectedRuntime"
            :sort-by="sortBy"
            :available-genres="availableGenres"
            :runtime-ranges="runtimeRanges"
            :has-active-filters="hasActiveFilters"
            :filtered-count="filteredResults.length"
            :total-count="searchResults.length"
            :is-loading-metadata="isLoadingMetadata"
            :metadata-progress="metadataProgress"
            :show-search="false"
            :min-rating="minRating"
            :rating-options="RATING_OPTIONS"
            :sort-labels="SEARCH_SORT_LABELS"
            :embedded="true"
            sort-modal-title="Sort search results"
            @update:selected-runtime="selectedRuntime = $event"
            @update:sort-by="sortBy = $event"
            @update:min-rating="minRating = $event"
            @toggle-genre="toggleGenre"
            @clear-filters="clearFilters"
          />
        </div>

        <div
          v-if="isSearching"
          class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5"
        >
          <SkeletonSearchCard v-for="item in SKELETON_CARD_COUNT" :key="item" />
        </div>

        <div
          v-else-if="!hasSearchQuery && searchResults.length === 0 && !isSearching"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">
            No popular movies available right now
          </p>
        </div>

        <div
          v-else-if="hasSearchQuery && searchResults.length === 0 && !isSearching"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">
            No results for "{{ searchQuery }}"
          </p>
        </div>

        <div
          v-else-if="searchResults.length > 0 && filteredResults.length === 0 && hasActiveFilters"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">No results match these filters</p>
          <button
            type="button"
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
              <MovieSearchCard
                v-for="movie in row.data.items"
                :key="movie.id"
                :movie="movie"
                :is-watched="isAlreadyWatched(movie.id)"
                :is-in-my-list="isInMyList(movie.id)"
                @add="addToWatched"
                @remove="removeFromWatchedList"
                @details="openDetails"
                @toggle-mylist="toggleMyList"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <MovieDetails
      :is-open="isModalOpen"
      :movie="selectedMovie"
      :show-add-button="true"
      :is-watched="selectedMovie ? isAlreadyWatched(selectedMovie.id) : false"
      :show-my-list-button="true"
      :is-in-my-list="selectedMovie ? isInMyList(selectedMovie.id) : false"
      @close="closeDetails"
      @add="addToWatchedFromModal"
      @remove="removeFromWatchedFromModal"
      @toggle-mylist="toggleMyListFromModal"
    />

    <LoginPromptModal :is-open="showLoginModal" @close="handleModalClose" />
  </div>
</template>

<script setup lang="ts">
import type { Movie, SearchDisplayMovie, SearchMovie as ApiSearchMovie } from '~/types/movie'
import { SEARCH_SORT_LABELS, useFilters } from '~/composables/useFilters'

interface SearchMoviesResponse {
  results: ApiSearchMovie[]
}

interface RatingOption {
  label: string
  value: number
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
}
const SEARCH_DEBOUNCE_MS = 500
const SEARCH_METADATA_BATCH_SIZE = 5
const SKELETON_CARD_COUNT = 6
const RELEASE_YEAR_INDEX = 0
const FALLBACK_RELEASE_YEAR = 0
const DEFAULT_METADATA_PROGRESS = { loaded: 0, total: 0 }
const SEARCH_ROW_HEIGHT = 390
const RATING_OPTIONS: RatingOption[] = [
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
]

const { user, isAuthenticated } = useAuth()
const {
  markAsWatched,
  removeFromWatched,
  queuePendingWatchedMovie,
  removePendingWatchedMovie,
  watchedMovies,
} = useWatchedMovies()
const { myList, addToMyList, removeFromMyList } = useMyList()
const { getMovieDetails } = useMovieDetails()

const searchQuery = useState('search-query', () => '')
const searchResults = useState<SearchDisplayMovie[]>('search-results', () => [])
const isSearching = ref(false)
const isLoadingMetadata = ref(false)
const metadataProgress = ref({ ...DEFAULT_METADATA_PROGRESS })
let debounceTimeout: ReturnType<typeof setTimeout> | null = null
let activeSearchToken = 0

const isModalOpen = ref(false)
const selectedMovie = ref<Movie | null>(null)
const isLoadingDetails = ref(false)

const showLoginModal = ref(false)
const pendingModalMovieId = ref<number | null>(null)
const {
  selectedGenres,
  selectedRuntime,
  sortBy,
  minRating,
  availableGenres,
  filteredMovies: filteredResults,
  hasActiveFilters,
  clearFilters,
  toggleGenre,
  runtimeRanges,
} = useFilters(searchResults, {
  searchQuery,
  enableRating: true,
  includeSearchInActiveState: false,
  clearSearchOnReset: false,
})
const { columnCount, virtualRows, containerProps, wrapperProps } = useVirtualGrid(filteredResults, {
  getKey: (movie) => movie.id,
  rowHeight: SEARCH_ROW_HEIGHT,
})

const hasSearchQuery = computed(() => searchQuery.value.trim() !== '')

const resultCountLabel = computed(() => {
  const totalCount = searchResults.value.length
  const noun = totalCount === 1 ? 'result' : 'results'

  if (!hasActiveFilters.value) {
    return `${totalCount} ${noun}`
  }

  return `${filteredResults.value.length} of ${totalCount} ${noun}`
})

const getMovieGenreNames = (movie: ApiSearchMovie) => {
  if (movie.genres?.length) {
    return movie.genres
  }

  return movie.genre_ids
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((name): name is string => Boolean(name))
}

const getReleaseYear = (movie: ApiSearchMovie) => {
  const releaseYear = movie.release_date.split('-')[RELEASE_YEAR_INDEX]
  return releaseYear ? Number.parseInt(releaseYear) : FALLBACK_RELEASE_YEAR
}

const normalizeSearchMovie = (movie: ApiSearchMovie): SearchDisplayMovie => ({
  ...movie,
  rating: movie.vote_average,
  genres: getMovieGenreNames(movie),
  year: getReleaseYear(movie),
})

const fetchSearchMetadata = async (movies: SearchDisplayMovie[], searchToken: number) => {
  if (movies.length === 0) {
    metadataProgress.value = { ...DEFAULT_METADATA_PROGRESS }
    return
  }

  isLoadingMetadata.value = true
  metadataProgress.value = { loaded: 0, total: movies.length }

  for (let index = 0; index < movies.length; index += SEARCH_METADATA_BATCH_SIZE) {
    if (searchToken !== activeSearchToken) {
      return
    }

    const batch = movies.slice(index, index + SEARCH_METADATA_BATCH_SIZE)
    const results = await Promise.allSettled(batch.map((movie) => getMovieDetails(movie.id)))

    if (searchToken !== activeSearchToken) {
      return
    }

    const metadataById = new Map<number, Pick<SearchDisplayMovie, 'genres' | 'runtime'>>()

    for (let batchIndex = 0; batchIndex < results.length; batchIndex++) {
      const result = results[batchIndex]
      const movie = batch[batchIndex]

      if (!movie || result?.status !== 'fulfilled') {
        continue
      }

      metadataById.set(movie.id, {
        genres: result.value.genres,
        runtime: result.value.runtime,
      })
    }

    searchResults.value = searchResults.value.map((movie) => {
      const metadata = metadataById.get(movie.id)

      if (!metadata) {
        return movie
      }

      return { ...movie, ...metadata }
    })

    metadataProgress.value = {
      loaded: Math.min(index + SEARCH_METADATA_BATCH_SIZE, movies.length),
      total: movies.length,
    }
  }

  isLoadingMetadata.value = false
}

const searchTMDB = async (query: string) => {
  const normalizedQuery = query.trim()
  const searchToken = ++activeSearchToken

  if (!normalizedQuery) {
    clearFilters()
    await loadPopularMovies()
    return
  }

  isSearching.value = true
  try {
    const data = await $fetch<SearchMoviesResponse>('/api/movies/search', {
      query: { q: normalizedQuery },
    })

    if (searchToken !== activeSearchToken) {
      return
    }

    searchResults.value = data.results.map(normalizeSearchMovie)
    void fetchSearchMetadata(searchResults.value, searchToken)
  } catch {
    if (searchToken === activeSearchToken) {
      searchResults.value = []
    }
  } finally {
    if (searchToken === activeSearchToken) {
      isSearching.value = false
    }
  }
}

const loadPopularMovies = async () => {
  const searchToken = ++activeSearchToken

  isSearching.value = true

  try {
    const data = await $fetch<SearchMoviesResponse>('/api/movies/popular')

    if (searchToken !== activeSearchToken) {
      return
    }

    searchResults.value = data.results.map(normalizeSearchMovie)
    void fetchSearchMetadata(searchResults.value, searchToken)
  } catch {
    if (searchToken === activeSearchToken) {
      searchResults.value = []
      isLoadingMetadata.value = false
      metadataProgress.value = { ...DEFAULT_METADATA_PROGRESS }
    }
  } finally {
    if (searchToken === activeSearchToken) {
      isSearching.value = false
    }
  }
}

const handleInput = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }

  debounceTimeout = setTimeout(() => {
    searchTMDB(searchQuery.value)
  }, SEARCH_DEBOUNCE_MS)
}

const clearSearch = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout)
  }

  activeSearchToken++
  searchQuery.value = ''
  clearFilters()
  void loadPopularMovies()
}

onMounted(() => {
  if (hasSearchQuery.value) {
    void searchTMDB(searchQuery.value)
    return
  }

  void loadPopularMovies()
})

const isAlreadyWatched = (tmdbId: number) => {
  return watchedMovies.value.some((movie) => movie.tmdbId === tmdbId)
}

const isInMyList = (tmdbId: number) => {
  return myList.value.some((movie) => movie.tmdbId === tmdbId)
}

const buildMovieToSave = (movie: SearchDisplayMovie) => ({
  ...movie,
  tmdbId: movie.id,
  poster: posterUrl(movie.poster_path),
  year: getReleaseYear(movie),
  genres: getMovieGenreNames(movie),
  runtime: movie.runtime,
})

const toggleMyList = async (movie: SearchDisplayMovie) => {
  if (!user.value) {
    showLoginModal.value = true
    return
  }

  if (isInMyList(movie.id)) {
    await removeFromMyList(movie.id)
    return
  }

  await addToMyList({
    id: movie.id,
    title: movie.title,
    year: getReleaseYear(movie),
    poster: posterUrl(movie.poster_path),
    rating: movie.vote_average,
    genres: getMovieGenreNames(movie),
    runtime: movie.runtime,
  })
}

const openDetails = async (movie: SearchDisplayMovie) => {
  if (isLoadingDetails.value) return
  isLoadingDetails.value = true
  try {
    selectedMovie.value = await getMovieDetails(movie.id)
    isModalOpen.value = true
  } catch {
  } finally {
    isLoadingDetails.value = false
  }
}

const closeDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}

const addToWatched = async (movie: SearchDisplayMovie) => {
  const movieToSave = buildMovieToSave(movie)

  if (!user.value) {
    queuePendingWatchedMovie(movieToSave)
    pendingModalMovieId.value = movie.id
    showLoginModal.value = true
    return
  }

  const status = await markAsWatched(movieToSave)
  if (status === 'unauthorized' || status === 'error') {
    queuePendingWatchedMovie(movieToSave)
  }
}

const handleModalClose = () => {
  showLoginModal.value = false
  if (!isAuthenticated.value && pendingModalMovieId.value !== null) {
    removePendingWatchedMovie(pendingModalMovieId.value)
  }
  pendingModalMovieId.value = null
}

const removeFromWatchedList = async (movie: SearchDisplayMovie) => {
  if (!user.value) return
  await removeFromWatched(movie.id)
}

const removeFromWatchedFromModal = async () => {
  if (!selectedMovie.value || !user.value) return
  await removeFromWatched(selectedMovie.value.id)
}

const toggleMyListFromModal = async () => {
  if (!selectedMovie.value || !user.value) {
    showLoginModal.value = true
    return
  }

  const movie = selectedMovie.value
  if (isInMyList(movie.id)) {
    await removeFromMyList(movie.id)
    return
  }

  await addToMyList({
    id: movie.id,
    title: movie.title,
    year: movie.year,
    poster: movie.poster,
    rating: movie.rating,
    genres: movie.genres,
    runtime: movie.runtime,
  })
}

const addToWatchedFromModal = async () => {
  if (!selectedMovie.value) return

  if (!user.value) {
    queuePendingWatchedMovie(selectedMovie.value)
    pendingModalMovieId.value = selectedMovie.value.id
    showLoginModal.value = true
    return
  }

  const status = await markAsWatched(selectedMovie.value)
  if (status === 'unauthorized' || status === 'error') {
    queuePendingWatchedMovie(selectedMovie.value)
  }
}
</script>
