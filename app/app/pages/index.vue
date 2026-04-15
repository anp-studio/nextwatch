<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
    <div class="pt-12 px-6 text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Movies For You</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Find your next movie.</p>
    </div>
    <div class="flex-1 relative w-full px-6 -mt-6 flex flex-col items-center justify-center">
      <div v-if="pending" class="w-full max-w-sm h-[65vh] relative mx-auto">
        <SkeletonMovieCard />
      </div>

      <div v-else-if="!isAuthenticated" class="text-center text-gray-500 dark:text-gray-400">
        <p class="text-xl font-medium mb-2">Sign in to get recommendations</p>
        <p class="text-sm mb-6">We'll suggest movies based on what you've watched.</p>
        <button
          class="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-full transition-colors"
          @click="showLoginModal = true"
        >
          Sign in
        </button>
      </div>

      <div v-else-if="errorState === 'unavailable'" class="text-center text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        <AlertMessage
          type="error"
          message="Recommendations are temporarily unavailable. Gemini is experiencing high demand — please try again in a moment."
        />
        <button
          class="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
          :disabled="pending"
          @click="refreshMovies"
        >
          Try again
        </button>
      </div>

      <div v-else-if="errorState === 'limit-reached'" class="text-center text-gray-500 dark:text-gray-400">
        <p class="text-2xl font-semibold mb-2">Daily limit reached!</p>
        <p class="text-base mb-6">Try again tomorrow.</p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="resetMovies"
          >
            Start Over
          </button>
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="refreshMovies"
          >
            Refresh
          </button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="getNewMovies"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': pending }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Load New Movies
          </button>
        </div>
      </div>

      <div v-else-if="movies.length === 0" class="text-center text-gray-500 dark:text-gray-400">
        <p class="text-2xl font-semibold mb-2">You're all caught up!</p>
        <p class="text-base mb-6">Ready for another round?</p>
        <div class="flex items-center justify-center gap-3">
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="resetMovies"
          >
            Start Over
          </button>
          <button
            class="inline-flex items-center gap-2 px-3 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="refreshMovies"
          >
            Refresh
          </button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="getNewMovies"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': pending }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Load New Movies
          </button>
        </div>
      </div>

      <div v-else class="w-full max-w-sm h-[65vh] relative mx-auto">
        <Transition name="card" mode="out-in">
          <MovieCard
            :key="currentMovieFormatted?.id"
            :movie="currentMovieFormatted"
            @dislike="handleDislike"
            @watched="handleLike"
            @to-watch="handleAddToList"
            @refresh="refreshMovies"
          />
        </Transition>
      </div>
    </div>

    <LoginPromptModal :is-open="showLoginModal" @close="handleModalClose" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const { markAsWatched, queuePendingWatchedMovie, removePendingWatchedMovie } = useWatchedMovies()
const { addToMyList } = useMyList()
const { isAuthenticated, loading: authLoading } = useAuth()
const { getMovieDetails } = useMovieDetails()
const supabase = useSupabase()

const movies = useState('discovery-movies', () => [])
const originalMovies = useState('discovery-original-movies', () => [])
const hasLoaded = useState('discovery-has-loaded', () => false)
const recommendationsPending = ref(true)
const detailsPending = ref(false)
const pending = computed(() => recommendationsPending.value || detailsPending.value)
const showLoginModal = ref(false)
const errorState = ref(null)
const pendingModalMovieId = ref(null)
const currentMovieDetails = useState('discovery-current-movie-details', () => null)
const detailsRequestId = ref(0)

const FETCH_MODE = {
  DEFAULT: 'default',
  GET_NEW: 'getNew',
  REFRESH: 'refresh',
}

const currentMovie = computed(() => movies.value[0] || null)

const currentMovieFormatted = computed(() => {
  const movie = movies.value[0]
  if (!movie) return null
  const details = currentMovieDetails.value

  return {
    id: details?.id ?? movie.tmdbId ?? null,
    title: details?.title ?? movie.name,
    year: details?.year ?? movie.year,
    image: details?.poster ?? '',
    genre: details?.genres?.join(', ') ?? 'Unknown Genre',
    director: details?.directors?.[0] ?? null,
  }
})

// fetch details only for the visible card to save requests
watch(
  currentMovie,
  async (movie) => {
    if (!movie?.tmdbId) {
      detailsRequestId.value += 1
      detailsPending.value = false
      currentMovieDetails.value = null
      return
    }
    if (currentMovieDetails.value?.id === movie.tmdbId) return

    detailsRequestId.value += 1
    const requestId = detailsRequestId.value
    detailsPending.value = true
    currentMovieDetails.value = null

    try {
      const details = await getMovieDetails(movie.tmdbId)
      if (requestId === detailsRequestId.value) {
        currentMovieDetails.value = details
      }
    } catch {
      if (requestId === detailsRequestId.value) {
        currentMovieDetails.value = null
      }
    } finally {
      if (requestId === detailsRequestId.value) {
        detailsPending.value = false
      }
    }
  },
  { immediate: true }
)

const getErrorStatusCode = (err) =>
  err?.statusCode ?? err?.status ?? err?.response?.status

const isUnavailableError = (err) => {
  if (getErrorStatusCode(err) === 503) return true
  const message = `${err?.data?.statusMessage ?? ''} ${err?.message ?? ''}`.toLowerCase()
  return message.includes('503') || message.includes('service unavailable') || message.includes('high demand')
}

const isLimitReachedError = (err) => {
  if (getErrorStatusCode(err) === 429) return true
  const message = `${err?.data?.statusMessage ?? ''} ${err?.message ?? ''}`.toLowerCase()
  return message.includes('daily recommendation limit') || message.includes('429')
}

const fetchRecommendations = async (mode = FETCH_MODE.DEFAULT) => {
  recommendationsPending.value = true
  errorState.value = null
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) return

    const params =
      mode === FETCH_MODE.GET_NEW
        ? { getNew: 'true' }
        : mode === FETCH_MODE.REFRESH
          ? { refresh: 'true' }
          : {}

    const { recommendations } = await $fetch('/api/recommend', {
      params,
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    currentMovieDetails.value = null

    movies.value = recommendations
    originalMovies.value = recommendations
  } catch (err) {
    console.error('[recommend] fetch failed', err)
    if (isLimitReachedError(err)) {
      errorState.value = 'limit-reached'
    } else if (isUnavailableError(err)) {
      errorState.value = 'unavailable'
    }
  } finally {
    hasLoaded.value = true
    recommendationsPending.value = false
  }
}

const getNewMovies = () => fetchRecommendations(FETCH_MODE.GET_NEW)
const refreshMovies = () => fetchRecommendations(FETCH_MODE.REFRESH)
const { myList } = useMyList()
const resetMovies = () => {
  if (originalMovies.value.length === 0) {
    return fetchRecommendations(FETCH_MODE.DEFAULT)
  }
  const myListIds = new Set(myList.value.map((m) => m.tmdbId))
  movies.value = originalMovies.value.filter((m) => !myListIds.has(m.tmdbId))
  currentMovieDetails.value = null
}

// wait for auth to finish initializing before deciding whether to fetch.
// onMounted fires before initialize() resolves, so isAuthenticated is not yet reliable there.
watch(
  authLoading,
  (isLoading) => {
    if (isLoading) return
    if (!isAuthenticated.value) {
      recommendationsPending.value = false
      return
    }
    if (hasLoaded.value) {
      recommendationsPending.value = false
      return
    }
    fetchRecommendations(FETCH_MODE.DEFAULT)
  },
  { immediate: true }
)

const handleDislike = () => {
  if (movies.value.length > 0) {
    movies.value.shift()
  }
}

const handleLike = async () => {
  if (!currentMovie.value) return

  const rawMovie = currentMovie.value
  const details = currentMovieDetails.value

  movies.value.shift()

  const movieToSave = {
    id: details?.id ?? rawMovie.tmdbId ?? 0,
    title: details?.title ?? rawMovie.name,
    year: details?.year ?? rawMovie.year,
    poster: details?.poster ?? '',
  }

  if (isAuthenticated.value) {
    const status = await markAsWatched(movieToSave)
    if (status === 'unauthorized' || status === 'error') {
      queuePendingWatchedMovie(movieToSave)
    }
  } else {
    queuePendingWatchedMovie(movieToSave)
    pendingModalMovieId.value = movieToSave.id
    showLoginModal.value = true
  }
}

const handleAddToList = async () => {
  if (!currentMovie.value) return

  const rawMovie = currentMovie.value
  const details = currentMovieDetails.value

  movies.value.shift()

  const movieToSave = {
    id: details?.id ?? rawMovie.tmdbId ?? 0,
    title: details?.title ?? rawMovie.name,
    year: details?.year ?? rawMovie.year,
    poster: details?.poster ?? '',
  }

  if (isAuthenticated.value) {
    await addToMyList(movieToSave)
  } else {
    showLoginModal.value = true
  }
}

const handleModalClose = () => {
  showLoginModal.value = false
  if (!isAuthenticated.value && pendingModalMovieId.value !== null) {
    removePendingWatchedMovie(pendingModalMovieId.value)
  }
  pendingModalMovieId.value = null
  if (isAuthenticated.value && movies.value.length === 0) {
    fetchRecommendations(FETCH_MODE.DEFAULT)
  }
}
</script>
