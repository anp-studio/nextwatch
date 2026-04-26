<template>
  <div class="pt-6 pl-6 pb-6 h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <div class="mb-6 flex-shrink-0">
      <div class="relative w-full shadow-sm rounded-2xl overflow-hidden">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          @input="handleInput"
          type="text"
          placeholder="Find a movie..."
          class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-800 border-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium outline-none"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-hidden pb-20 pr-6">
      <div v-if="searchResults.length > 0 || hasActiveFilters" class="flex-shrink-0 mb-3">
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
                No genres available
              </div>
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
              class="absolute z-30 mt-1 left-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1"
            >
              <button
                v-for="(label, key) in sortLabels"
                :key="key"
                @click="sortBy = key; openDropdown = null"
                class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="sortBy === key ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <div class="relative dropdown-wrapper">
            <button
              @click="toggleDropdown('rating')"
              class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
              :class="minRating
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {{ minRating ? `${minRating}+` : 'Rating' }}
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-if="showRatingDropdown"
              class="absolute z-30 mt-1 left-0 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1"
            >
              <button
                @click="minRating = null; openDropdown = null"
                class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="!minRating ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
              >
                Any rating
              </button>
              <button
                v-for="opt in RATING_OPTIONS"
                :key="opt.value"
                @click="minRating = opt.value; openDropdown = null"
                class="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="minRating === opt.value ? 'text-rose-500 font-medium' : 'text-gray-700 dark:text-gray-300'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <button
            @click="hideWatched = !hideWatched"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
            :class="hideWatched
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
            Hide Watched
          </button>

          <button
            @click="hideInMyList = !hideInMyList"
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors"
            :class="hideInMyList
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Hide My List
          </button>

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

        <div v-if="hasActiveFilters && searchResults.length > 0" class="text-xs text-gray-400 mb-3">
          {{ filteredResults.length }} of {{ searchResults.length }} results
        </div>
      </div>

      <div v-if="isSearching" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        <SkeletonSearchCard v-for="n in 6" :key="n" />
      </div>

      <div
        v-else-if="!searchQuery && searchResults.length === 0"
        class="text-center text-gray-400 dark:text-gray-500 py-10"
      >
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
        <p>Enter a movie name to search.</p>
      </div>

      <div
        v-else-if="searchQuery && searchResults.length === 0 && !isSearching"
        class="text-center text-gray-500 dark:text-gray-400 py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600"
      >
        <p>No results for "{{ searchQuery }}"</p>
      </div>

      <div
        v-else-if="searchResults.length > 0 && filteredResults.length === 0 && hasActiveFilters"
        class="text-center text-gray-500 dark:text-gray-400 py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600"
      >
        <p>No results match your filters.</p>
        <button @click="clearFilters" class="text-rose-500 mt-2 inline-block hover:underline">
          Clear filters
        </button>
      </div>

      <TransitionGroup
        name="list"
        tag="div"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
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

<script setup>
import { ref } from 'vue'

const TMDB_GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

const { user, isAuthenticated } = useAuth()
const { markAsWatched, removeFromWatched, queuePendingWatchedMovie, removePendingWatchedMovie, watchedMovies } = useWatchedMovies()
const { myList, addToMyList, removeFromMyList } = useMyList()
const { getMovieDetails } = useMovieDetails()

const onBeforeEnter = (el) => {
  el.style.opacity = '0'
  el.style.transform = 'translateY(20px)'
}
const onEnter = (el, done) => {
  const delay = Math.min(Number(el.dataset.index) * 50, 500)
  el.style.transition = `opacity 300ms ease ${delay}ms, transform 300ms ease ${delay}ms`
  void el.offsetHeight
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
  setTimeout(() => {
    el.style.removeProperty('opacity')
    el.style.removeProperty('transform')
    el.style.removeProperty('transition')
    done()
  }, 300 + delay)
}
const onBeforeLeave = (el) => {
  const rect = el.getBoundingClientRect()
  el.style.position = 'fixed'
  el.style.top = `${rect.top}px`
  el.style.left = `${rect.left}px`
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
  el.style.zIndex = '1'
}
const onLeave = (el, done) => {
  el.style.transition = 'opacity 250ms ease, transform 250ms ease'
  void el.offsetHeight
  el.style.opacity = '0'
  el.style.transform = 'scale(0)'
  setTimeout(done, 250)
}

const searchQuery = useState('search-query', () => '')
const searchResults = useState('search-results', () => [])
const isSearching = ref(false)
let debounceTimeout = null

const isModalOpen = ref(false)
const selectedMovie = ref(null)
const isLoadingDetails = ref(false)

const showLoginModal = ref(false)
const pendingModalMovieId = ref(null)

const searchTMDB = async (query) => {
  if (!query) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
    const data = await response.json()
    searchResults.value = data.results || []
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const handleInput = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    searchTMDB(searchQuery.value)
  }, 500)
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}

const selectedGenres = ref([])
const sortBy = ref('default')
const minRating = ref(null)
const RATING_OPTIONS = [
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
]
const hideWatched = ref(false)
const hideInMyList = ref(false)

const openDropdown = ref(null)
const showGenreDropdown = computed(() => openDropdown.value === 'genre')
const showSortDropdown = computed(() => openDropdown.value === 'sort')
const showRatingDropdown = computed(() => openDropdown.value === 'rating')
const toggleDropdown = (name) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const sortLabels = {
  'default': 'Default',
  'title-asc': 'Title A\u2013Z',
  'title-desc': 'Title Z\u2013A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

const getMovieGenreNames = (movie) => {
  return (movie.genre_ids || []).map((id) => TMDB_GENRE_MAP[id]).filter(Boolean)
}

const availableGenres = computed(() => {
  const genreSet = new Set()
  for (const movie of searchResults.value) {
    for (const name of getMovieGenreNames(movie)) {
      genreSet.add(name)
    }
  }
  return [...genreSet].sort()
})

const toggleGenre = (genre) => {
  const idx = selectedGenres.value.indexOf(genre)
  if (idx >= 0) {
    selectedGenres.value.splice(idx, 1)
  } else {
    selectedGenres.value.push(genre)
  }
}

const filteredResults = computed(() => {
  let result = [...searchResults.value]

  if (selectedGenres.value.length > 0) {
    result = result.filter((m) => {
      const genres = getMovieGenreNames(m)
      return selectedGenres.value.some((g) => genres.includes(g))
    })
  }

  if (minRating.value) {
    result = result.filter((m) => (m.vote_average || 0) >= minRating.value)
  }

  if (hideWatched.value) {
    result = result.filter((m) => !isAlreadyWatched(m.id))
  }

  if (hideInMyList.value) {
    result = result.filter((m) => !isInMyList(m.id))
  }

  if (sortBy.value !== 'default') {
    result.sort((a, b) => {
      const yearA = a.release_date ? parseInt(a.release_date.split('-')[0]) : 0
      const yearB = b.release_date ? parseInt(b.release_date.split('-')[0]) : 0
      switch (sortBy.value) {
        case 'title-asc': return a.title.localeCompare(b.title)
        case 'title-desc': return b.title.localeCompare(a.title)
        case 'year-desc': return yearB - yearA
        case 'year-asc': return yearA - yearB
        default: return 0
      }
    })
  }

  return result
})

const hasActiveFilters = computed(() => {
  return selectedGenres.value.length > 0 || sortBy.value !== 'default' || minRating.value !== null || hideWatched.value || hideInMyList.value
})

const clearFilters = () => {
  selectedGenres.value = []
  sortBy.value = 'default'
  minRating.value = null
  hideWatched.value = false
  hideInMyList.value = false
}

const closeDropdowns = (e) => {
  const target = e.target
  if (!target.closest('.dropdown-wrapper')) {
    openDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdowns)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
})

const isAlreadyWatched = (tmdbId) => {
  return watchedMovies.value.some((movie) => movie.tmdbId === tmdbId)
}

const isInMyList = (tmdbId) => {
  return myList.value.some((movie) => movie.tmdbId === tmdbId)
}

const toggleMyList = async (movie) => {
  if (!user.value) {
    showLoginModal.value = true
    return
  }

  if (isInMyList(movie.id)) {
    await removeFromMyList(movie.id)
  } else {
    await addToMyList({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0,
      poster: posterUrl(movie.poster_path),
    })
  }
}

const openDetails = async (movie) => {
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

const buildMovieToSave = (movie) => ({
  ...movie,
  tmdbId: movie.id,
  poster: posterUrl(movie.poster_path),
  year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0,
})

const addToWatched = async (movie) => {
  if (!user.value) {
    const movieToSave = buildMovieToSave(movie)
    queuePendingWatchedMovie(movieToSave)
    pendingModalMovieId.value = movie.id
    showLoginModal.value = true
    return
  }

  const movieToSave = buildMovieToSave(movie)
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

const removeFromWatchedList = async (movie) => {
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
  } else {
    await addToMyList({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
    })
  }
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
