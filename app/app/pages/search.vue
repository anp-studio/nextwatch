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
              v-if="hasSearchQuery"
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
            v-if="hasSearchQuery"
            class="mt-2"
            :search-query="searchQuery"
            :selected-genres="selectedGenres"
            :selected-runtime="selectedRuntime"
            :sort-by="sortBy"
            :available-genres="availableGenres"
            :runtime-ranges="RUNTIME_RANGES"
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
          v-else-if="!hasSearchQuery && searchResults.length === 0"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">Enter a movie name to search</p>
        </div>

        <div
          v-else-if="hasSearchQuery && searchResults.length === 0 && !isSearching"
          class="rounded-[1.75rem] border border-dashed border-outline-variant bg-surface-container-low px-6 py-14 text-center shadow-glow"
        >
          <p class="text-2xl font-semibold text-on-background">No results for "{{ searchQuery }}"</p>
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

        <TransitionGroup
          v-else
          name="list"
          tag="div"
          class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @before-leave="onBeforeLeave"
          @leave="onLeave"
        >
          <MovieSearchCard
            v-for="(movie, index) in filteredResults"
            :key="movie.id"
            :data-index="index"
            :movie="movie"
            :is-watched="isAlreadyWatched(movie.id)"
            :is-in-my-list="isInMyList(movie.id)"
            @add="addToWatched"
            @remove="removeFromWatchedList"
            @details="openDetails"
            @toggle-mylist="toggleMyList"
          />
        </TransitionGroup>
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
import type { RuntimeRange, SortOption } from '~/composables/useWatchedFilters'
import type { Movie } from '~/types/movie'
import { RUNTIME_RANGES } from '~/composables/useWatchedFilters'

interface SearchMovie {
  id: number
  title: string
  original_title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  runtime?: number | null
  genres?: string[]
}

interface SearchMoviesResponse {
  results: SearchMovie[]
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
const ENTER_ANIMATION_DELAY_MS = 50
const MAX_ENTER_ANIMATION_DELAY_MS = 500
const ENTER_ANIMATION_MS = 300
const LEAVE_ANIMATION_MS = 250
const SEARCH_METADATA_BATCH_SIZE = 5
const SKELETON_CARD_COUNT = 6
const DEFAULT_SORT: SortOption = 'default'
const RELEASE_YEAR_INDEX = 0
const FALLBACK_RELEASE_YEAR = 0
const DEFAULT_METADATA_PROGRESS = { loaded: 0, total: 0 }
const RATING_OPTIONS: RatingOption[] = [
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
]
const SEARCH_SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  'title-asc': 'Title A-Z',
  'title-desc': 'Title Z-A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

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
const searchResults = useState<SearchMovie[]>('search-results', () => [])
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

const selectedGenres = ref<string[]>([])
const selectedRuntime = ref<RuntimeRange | null>(null)
const sortBy = ref<SortOption>(DEFAULT_SORT)
const minRating = ref<number | null>(null)

const hasSearchQuery = computed(() => searchQuery.value.trim() !== '')

const resultCountLabel = computed(() => {
  const totalCount = searchResults.value.length
  const noun = totalCount === 1 ? 'result' : 'results'

  if (!hasActiveFilters.value) {
    return `${totalCount} ${noun}`
  }

  return `${filteredResults.value.length} of ${totalCount} ${noun}`
})

const getMovieGenreNames = (movie: SearchMovie) => {
  if (movie.genres?.length) {
    return movie.genres
  }

  return movie.genre_ids
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((name): name is string => Boolean(name))
}

const getReleaseYear = (movie: SearchMovie) => {
  const releaseYear = movie.release_date.split('-')[RELEASE_YEAR_INDEX]
  return releaseYear ? Number.parseInt(releaseYear) : FALLBACK_RELEASE_YEAR
}

const availableGenres = computed(() => {
  const genreSet = new Set<string>()

  for (const movie of searchResults.value) {
    for (const name of getMovieGenreNames(movie)) {
      genreSet.add(name)
    }
  }

  return [...genreSet].sort()
})

const filteredResults = computed(() => {
  let result = [...searchResults.value]

  if (selectedGenres.value.length > 0) {
    result = result.filter((movie) => {
      const genres = getMovieGenreNames(movie)
      return selectedGenres.value.some((genre) => genres.includes(genre))
    })
  }

  if (selectedRuntime.value) {
    const { min, max } = selectedRuntime.value
    result = result.filter((movie) => {
      if (typeof movie.runtime !== 'number') {
        return false
      }

      return movie.runtime >= min && movie.runtime <= max
    })
  }

  if (minRating.value !== null) {
    const ratingThreshold = minRating.value
    result = result.filter((movie) => movie.vote_average >= ratingThreshold)
  }

  if (sortBy.value !== DEFAULT_SORT) {
    result.sort((firstMovie, secondMovie) => {
      switch (sortBy.value) {
        case 'title-asc':
          return firstMovie.title.localeCompare(secondMovie.title)
        case 'title-desc':
          return secondMovie.title.localeCompare(firstMovie.title)
        case 'year-desc':
          return getReleaseYear(secondMovie) - getReleaseYear(firstMovie)
        case 'year-asc':
          return getReleaseYear(firstMovie) - getReleaseYear(secondMovie)
        default:
          return FALLBACK_RELEASE_YEAR
      }
    })
  }

  return result
})

const hasActiveFilters = computed(() => {
  return (
    selectedGenres.value.length > 0 ||
    selectedRuntime.value !== null ||
    minRating.value !== null ||
    sortBy.value !== DEFAULT_SORT
  )
})

const clearFilters = () => {
  selectedGenres.value = []
  selectedRuntime.value = null
  minRating.value = null
  sortBy.value = DEFAULT_SORT
}

const toggleGenre = (genre: string) => {
  const existingIndex = selectedGenres.value.indexOf(genre)

  if (existingIndex >= 0) {
    selectedGenres.value.splice(existingIndex, 1)
    return
  }

  selectedGenres.value.push(genre)
}

const fetchSearchMetadata = async (movies: SearchMovie[], searchToken: number) => {
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

    const metadataById = new Map<number, Pick<SearchMovie, 'genres' | 'runtime'>>()

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
    searchResults.value = []
    isLoadingMetadata.value = false
    metadataProgress.value = { ...DEFAULT_METADATA_PROGRESS }
    clearFilters()
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

    searchResults.value = data.results
    void fetchSearchMetadata(data.results, searchToken)
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
  searchResults.value = []
  isLoadingMetadata.value = false
  metadataProgress.value = { ...DEFAULT_METADATA_PROGRESS }
  clearFilters()
}

const onBeforeEnter = (element: Element) => {
  const htmlElement = element as HTMLElement
  htmlElement.style.opacity = '0'
  htmlElement.style.transform = 'translateY(20px)'
}

const onEnter = (element: Element, done: () => void) => {
  const htmlElement = element as HTMLElement
  const delay = Math.min(
    Number(htmlElement.dataset.index) * ENTER_ANIMATION_DELAY_MS,
    MAX_ENTER_ANIMATION_DELAY_MS
  )

  htmlElement.style.transition = `opacity ${ENTER_ANIMATION_MS}ms ease ${delay}ms, transform ${ENTER_ANIMATION_MS}ms ease ${delay}ms`
  void htmlElement.offsetHeight
  htmlElement.style.opacity = '1'
  htmlElement.style.transform = 'translateY(0)'
  setTimeout(() => {
    htmlElement.style.removeProperty('opacity')
    htmlElement.style.removeProperty('transform')
    htmlElement.style.removeProperty('transition')
    done()
  }, ENTER_ANIMATION_MS + delay)
}

const onBeforeLeave = (element: Element) => {
  const htmlElement = element as HTMLElement
  const rect = htmlElement.getBoundingClientRect()
  htmlElement.style.position = 'fixed'
  htmlElement.style.top = `${rect.top}px`
  htmlElement.style.left = `${rect.left}px`
  htmlElement.style.width = `${rect.width}px`
  htmlElement.style.height = `${rect.height}px`
  htmlElement.style.zIndex = '1'
}

const onLeave = (element: Element, done: () => void) => {
  const htmlElement = element as HTMLElement
  htmlElement.style.transition = `opacity ${LEAVE_ANIMATION_MS}ms ease, transform ${LEAVE_ANIMATION_MS}ms ease`
  void htmlElement.offsetHeight
  htmlElement.style.opacity = '0'
  htmlElement.style.transform = 'scale(0)'
  setTimeout(done, LEAVE_ANIMATION_MS)
}

const isAlreadyWatched = (tmdbId: number) => {
  return watchedMovies.value.some((movie) => movie.tmdbId === tmdbId)
}

const isInMyList = (tmdbId: number) => {
  return myList.value.some((movie) => movie.tmdbId === tmdbId)
}

const buildMovieToSave = (movie: SearchMovie) => ({
  ...movie,
  tmdbId: movie.id,
  poster: posterUrl(movie.poster_path),
  year: getReleaseYear(movie),
  genres: getMovieGenreNames(movie),
  runtime: movie.runtime,
})

const toggleMyList = async (movie: SearchMovie) => {
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

const openDetails = async (movie: SearchMovie) => {
  if (isLoadingDetails.value) return
  isLoadingDetails.value = true
  try {
    selectedMovie.value = await getMovieDetails(movie.id)
    isModalOpen.value = true
  } catch {
    // Leave the modal closed when details cannot be loaded.
  } finally {
    isLoadingDetails.value = false
  }
}

const closeDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}

const addToWatched = async (movie: SearchMovie) => {
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

const removeFromWatchedList = async (movie: SearchMovie) => {
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
