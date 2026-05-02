<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
    <div class="pt-12 px-6 text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Movies For You</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Find your next movie.</p>
    </div>
    <div class="flex-1 relative w-full px-6 -mt-6 flex flex-col items-center justify-center">
      <div v-if="pending" class="w-full max-w-sm md:max-w-[min(24rem,calc((65vh-12rem)*2/3))] h-[65vh] relative mx-auto">
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

      <div
        v-else-if="showBlockingRecommendationFailure"
        class="text-center text-gray-500 dark:text-gray-400 max-w-sm mx-auto"
      >
        <p v-if="isLimitReachedFailure" class="text-2xl font-semibold mb-2">Daily limit reached!</p>
        <AlertMessage type="error" :message="recommendationFailureMessage" />
        <div
          v-if="showRecommendationFailureActions"
          class="mt-6 flex items-center justify-center gap-3"
        >
          <button
            v-if="canLoadPreviousRecommendations"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
            :disabled="pending"
            @click="loadPreviousRecommendations"
          >
            Load Previous Recommendations
          </button>
          <button
            v-if="canRetryRecommendations"
            class="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
            :disabled="pending || retrySecondsLeft > 0"
            @click="retryRecommendations"
          >
            {{ retryButtonLabel }}
          </button>
        </div>
      </div>

      <div
        v-else-if="showRecommendationEmptyState"
        class="text-center text-gray-500 dark:text-gray-400"
      >
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

      <div v-else class="w-full max-w-sm md:max-w-[min(24rem,calc((65vh-12rem)*2/3))] mx-auto flex flex-col gap-4">
        <div
          v-if="showInlineRecommendationFailure"
          class="w-full text-center text-gray-500 dark:text-gray-400"
        >
          <AlertMessage type="error" :message="recommendationFailureMessage" />
          <div
            v-if="showRecommendationFailureActions"
            class="mt-3 flex items-center justify-center gap-3"
          >
            <button
              v-if="canLoadPreviousRecommendations"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-semibold rounded-full transition-colors"
              :disabled="pending"
              @click="loadPreviousRecommendations"
            >
              Load Previous Recommendations
            </button>
            <button
              v-if="canRetryRecommendations"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-full transition-colors"
              :disabled="pending || retrySecondsLeft > 0"
              @click="retryRecommendations"
            >
              {{ retryButtonLabel }}
            </button>
          </div>
        </div>

        <div class="w-full h-[65vh] relative mx-auto">
          <Transition name="card" mode="out-in">
            <MovieCard
              v-if="currentMovieFormatted"
              :key="currentMovieFormatted?.id"
              :movie="currentMovieFormatted"
              :is-in-my-list="isInMyList"
              :is-watched="isWatched"
              @dislike="handleDislike"
              @watched="handleLike"
              @to-watch="handleAddToList"
              @refresh="refreshMovies"
            />
          </Transition>
        </div>
      </div>
    </div>

    <LoginPromptModal :is-open="showLoginModal" @close="handleModalClose" />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-full px-5 py-3 shadow-lg border border-gray-200 dark:border-transparent flex items-center gap-3 max-w-sm"
      >
        <span class="text-sm truncate">
          <strong>{{ undoAction.movie.title }}</strong>
          {{ undoAction.type === 'watched' ? 'marked as watched' : 'added to My List' }}
        </span>
        <button
          class="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-semibold text-sm whitespace-nowrap transition-colors"
          @click="handleUndo"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
// @pmackovic mozda treba da se pomeri u neki composable

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const FETCH_MODE = {
  DEFAULT: 'default',
  GET_NEW: 'getNew',
  REFRESH: 'refresh',
}

const RETRY_COOLDOWN_S = 30
const RETRY_COOLDOWN_KEY = 'retry-cooldown-expires'
const FALLBACK_RECOMMENDATION_ERROR_MESSAGE = 'Recommendations are unavailable right now.'

const {
  watchedMovies,
  markAsWatched,
  removeFromWatched,
  queuePendingWatchedMovie,
  removePendingWatchedMovie,
} = useWatchedMovies()
const { myList, addToMyList, removeFromMyList } = useMyList()
const { isAuthenticated, loading: authLoading } = useAuth()
const { getMovieDetails } = useMovieDetails()
const supabase = useSupabase()

const movies = useState('discovery-movies', () => [])
const originalMovies = useState('discovery-original-movies', () => [])
const hasLoaded = useState('discovery-has-loaded', () => false)
const hasSuccessfulRecommendationLoad = useState(
  'discovery-has-successful-recommendation-load',
  () => false
)
const recommendationsPending = ref(true)
const detailsPending = ref(false)
const pending = computed(() => recommendationsPending.value || detailsPending.value)
const showLoginModal = ref(false)
const recommendationFailure = ref(null)
const lastFetchMode = ref(FETCH_MODE.DEFAULT)
const pendingModalMovieId = ref(null)
const currentMovieDetails = useState('discovery-current-movie-details', () => null)
const detailsRequestId = ref(0)
const retrySecondsLeft = ref(0)
let retryTimerHandle = null

function toRecommendationItems(recommendations) {
  return recommendations.flatMap((recommendation) => {
    if (typeof recommendation === 'number' && Number.isInteger(recommendation) && recommendation > 0) {
      return [{ tmdbId: recommendation }]
    }

    if (
      recommendation &&
      typeof recommendation === 'object' &&
      typeof recommendation.tmdbId === 'number' &&
      Number.isInteger(recommendation.tmdbId) &&
      recommendation.tmdbId > 0
    ) {
      return [{ tmdbId: recommendation.tmdbId }]
    }

    return []
  })
}

function clearRetryCooldown() {
  retrySecondsLeft.value = 0
  if (retryTimerHandle !== null) {
    clearInterval(retryTimerHandle)
    retryTimerHandle = null
  }
  localStorage.removeItem(RETRY_COOLDOWN_KEY)
}

function resumeRetryCooldown(expiresAt) {
  if (retryTimerHandle !== null) clearInterval(retryTimerHandle)
  const tick = () => {
    const secondsLeft = Math.ceil((expiresAt - Date.now()) / 1000)
    if (secondsLeft <= 0) {
      clearRetryCooldown()
      return
    }
    retrySecondsLeft.value = secondsLeft
  }
  tick()
  retryTimerHandle = setInterval(tick, 1000)
}

function startRetryCooldown() {
  const expiresAt = Date.now() + RETRY_COOLDOWN_S * 1000
  localStorage.setItem(RETRY_COOLDOWN_KEY, String(expiresAt))
  resumeRetryCooldown(expiresAt)
}

function getErrorStatusCode(error) {
  return error?.statusCode ?? error?.status ?? error?.response?.status ?? 500
}

function getErrorStatusMessage(error) {
  const candidates = [error?.data?.statusMessage, error?.statusMessage, error?.message]
  const message = candidates.find((c) => typeof c === 'string') ?? ''
  return message || FALLBACK_RECOMMENDATION_ERROR_MESSAGE
}

function createRecommendationFailure({
  statusCode,
  statusMessage,
  retryable = false,
  staleRecommendations = null,
  staleApplied = false,
}) {
  return {
    statusCode,
    statusMessage,
    retryable,
    staleRecommendations:
      Array.isArray(staleRecommendations) && staleRecommendations.length > 0
        ? toRecommendationItems(staleRecommendations)
        : null,
    staleApplied,
  }
}

function createRecommendationFailureFromError(error) {
  const statusCode = getErrorStatusCode(error)
  return createRecommendationFailure({
    statusCode,
    statusMessage: getErrorStatusMessage(error),
    retryable: statusCode === 503,
    staleRecommendations: error?.data?.staleRecommendations ?? null,
  })
}

function setRecommendationFailure(failure) {
  recommendationFailure.value = failure

  if (failure.retryable) {
    startRetryCooldown()
    return
  }

  clearRetryCooldown()
}

function applyRecommendations(recommendations) {
  const recommendationItems = toRecommendationItems(recommendations)
  movies.value = recommendationItems
  originalMovies.value = recommendationItems.map((recommendation) => ({ ...recommendation }))
  currentMovieDetails.value = null
  hasSuccessfulRecommendationLoad.value = true
}

const currentMovie = computed(() => movies.value[0] || null)
const recommendationFailureMessage = computed(
  () => recommendationFailure.value?.statusMessage ?? FALLBACK_RECOMMENDATION_ERROR_MESSAGE
)
const canRetryRecommendations = computed(() => recommendationFailure.value?.retryable === true)
const canLoadPreviousRecommendations = computed(() => {
  const staleRecommendations = recommendationFailure.value?.staleRecommendations
  return Array.isArray(staleRecommendations) && staleRecommendations.length > 0
})
const isLimitReachedFailure = computed(() => recommendationFailure.value?.statusCode === 429)
const showBlockingRecommendationFailure = computed(
  () =>
    recommendationFailure.value !== null &&
    movies.value.length === 0 &&
    !recommendationFailure.value.staleApplied
)
const showInlineRecommendationFailure = computed(
  () => recommendationFailure.value !== null && movies.value.length > 0
)
const showRecommendationFailureActions = computed(
  () => canRetryRecommendations.value || canLoadPreviousRecommendations.value
)
const showRecommendationEmptyState = computed(
  () =>
    hasSuccessfulRecommendationLoad.value &&
    recommendationFailure.value === null &&
    movies.value.length === 0
)
const retryButtonLabel = computed(() =>
  retrySecondsLeft.value > 0 ? `Try again (${retrySecondsLeft.value}s)` : 'Try again'
)

const currentMovieFormatted = computed(() => {
  const movie = movies.value[0]
  if (!movie) return null
  const details = currentMovieDetails.value

  return {
    id: details?.id ?? movie.tmdbId ?? null,
    title: details?.title ?? '',
    year: details?.year ?? 0,
    image: details?.poster ?? '',
    genre: details?.genres?.join(', ') ?? 'Unknown Genre',
    director: details?.directors?.[0] ?? null,
  }
})

const isInMyList = computed(() => {
  const id = currentMovie.value?.tmdbId
  if (!id) return false
  return myList.value.some((m) => m.tmdbId === id)
})

const isWatched = computed(() => {
  const id = currentMovie.value?.tmdbId
  if (!id) return false
  return watchedMovies.value.some((movie) => movie.tmdbId === id)
})

onMounted(() => {
  const stored = localStorage.getItem(RETRY_COOLDOWN_KEY)
  if (stored) {
    const expiresAt = Number(stored)
    if (Date.now() < expiresAt) {
      resumeRetryCooldown(expiresAt)
      return
    }
    localStorage.removeItem(RETRY_COOLDOWN_KEY)
  }
})

onUnmounted(() => {
  if (retryTimerHandle !== null) clearInterval(retryTimerHandle)
})

// avoid wasting TMDB quota on movies the user may never reach in the stack
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

const fetchRecommendations = async (mode = FETCH_MODE.DEFAULT) => {
  recommendationsPending.value = true
  recommendationFailure.value = null
  lastFetchMode.value = mode

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

    const response = await $fetch('/api/recommend', {
      params,
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (response.regenerationError) {
      setRecommendationFailure(
        createRecommendationFailure({
          ...response.regenerationError,
          staleRecommendations: response.staleRecommendations,
        })
      )
      return
    }

    if (!Array.isArray(response.recommendations)) {
    throw new Error('Recommendations response was missing a recommendation list.')
    }

    clearRetryCooldown()
    applyRecommendations(response.recommendations)
  } catch (error) {
    setRecommendationFailure(createRecommendationFailureFromError(error))
  } finally {
    hasLoaded.value = true
    recommendationsPending.value = false
  }
}

const retryRecommendations = () => fetchRecommendations(lastFetchMode.value)
const getNewMovies = () => fetchRecommendations(FETCH_MODE.GET_NEW)
const refreshMovies = () => fetchRecommendations(FETCH_MODE.REFRESH)

const loadPreviousRecommendations = () => {
  const staleRecommendations = recommendationFailure.value?.staleRecommendations
  if (!Array.isArray(staleRecommendations) || staleRecommendations.length === 0) return

  applyRecommendations(staleRecommendations)
  recommendationFailure.value = null
}

const resetMovies = () => {
  if (originalMovies.value.length === 0) {
    return fetchRecommendations(FETCH_MODE.DEFAULT)
  }
  const myListIds = new Set(myList.value.map((movie) => movie.tmdbId))
  movies.value = originalMovies.value.filter((movie) => !myListIds.has(movie.tmdbId))
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

function buildMovieToSave(rawMovie, details) {
  return {
    id: details?.id ?? rawMovie.tmdbId ?? 0,
    title: details?.title ?? '',
    year: details?.year ?? 0,
    poster: details?.poster ?? '',
  }
}

const handleLike = async () => {
  if (!currentMovie.value) return

  const rawMovie = currentMovie.value
  const details = currentMovieDetails.value

  movies.value.shift()

  const movieToSave = buildMovieToSave(rawMovie, details)

  if (isAuthenticated.value) {
    const status = await markAsWatched(movieToSave)
    if (status === 'unauthorized' || status === 'error') {
      queuePendingWatchedMovie(movieToSave)
    } else {
      showUndo(movieToSave, 'watched')
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

  const movieToSave = buildMovieToSave(rawMovie, details)

  if (isAuthenticated.value) {
    const status = await addToMyList(movieToSave)
    if (status === 'ok') {
      showUndo(movieToSave, 'my-list')
    }
  } else {
    showLoginModal.value = true
  }
}

const undoAction = ref(null)
let undoTimer = null

const dismissUndo = () => {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction.value = null
}

const showUndo = (movie, type) => {
  dismissUndo()
  undoAction.value = { movie, type }
  undoTimer = setTimeout(dismissUndo, 5000)
}

const handleUndo = async () => {
  const action = undoAction.value
  if (!action) return
  dismissUndo()

  if (action.type === 'watched') {
    await removeFromWatched(action.movie.id)
  } else {
    await removeFromMyList(action.movie.id)
  }

  movies.value.unshift({
    tmdbId: action.movie.id,
  })
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
