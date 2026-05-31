<template>
  <div class="relative flex h-full flex-col overflow-hidden bg-background text-on-background">
    <div
      class="flex h-full flex-col px-4 pb-[var(--footer-clearance,0.85rem)] pt-4 sm:px-6 sm:pt-5 lg:px-8"
    >
      <div v-if="pending" class="flex min-h-0 flex-1 items-center justify-center">
        <div class="mx-auto flex h-full min-h-0 w-full max-w-[82rem] items-center justify-center">
          <div
            class="flex h-full min-h-0 w-full flex-1 flex-col justify-center [--card-non-poster-height:clamp(9.25rem,19dvh,12rem)] [--fit-safety:clamp(0.85rem,2dvh,1.5rem)] [--footer-clearance:clamp(0.65rem,1.75dvh,1.25rem)] [--footer-height:4rem] [--header-height:4rem] [--height-fit-width:calc((100dvh-var(--header-height)-var(--footer-height)-var(--page-vertical-padding)-var(--footer-clearance)-var(--card-non-poster-height)-var(--fit-safety))/1.5)] [--page-vertical-padding:1.5rem] sm:[--footer-height:4.25rem] sm:[--page-vertical-padding:2rem] max-[760px]:[--card-non-poster-height:clamp(7.85rem,17dvh,9.75rem)] max-[760px]:[--fit-safety:clamp(0.65rem,1.5dvh,1rem)] max-[760px]:[--footer-clearance:clamp(0.5rem,1.4dvh,0.85rem)] max-[680px]:[--card-non-poster-height:clamp(7rem,16dvh,8.65rem)] max-[680px]:[--fit-safety:0.65rem] max-[680px]:[--footer-clearance:0.5rem]"
          >
            <SkeletonMovieCard variant="desktop" />
          </div>
        </div>
      </div>

      <div
        v-else-if="!isAuthenticated"
        class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-16 text-center text-on-surface-variant"
      >
        <p class="mb-2 text-2xl font-semibold text-on-background">Sign in to get recommendations</p>
        <p class="mb-8 text-[12px] uppercase tracking-[0.24em] text-on-surface-variant">
          We'll suggest movies based on what you've watched.
        </p>
        <button
          class="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary/90"
          @click="showLoginModal = true"
        >
          Sign in
        </button>
      </div>

      <div
        v-else-if="showBlockingRecommendationFailure"
        class="mx-auto max-w-md pt-16 text-center text-on-surface-variant"
      >
        <p v-if="isLimitReachedFailure" class="mb-2 text-2xl font-semibold text-on-background">
          Daily limit reached
        </p>
        <AlertMessage type="error" :message="recommendationFailureMessage" />
        <div
          v-if="showRecommendationFailureActions"
          class="mt-6 flex items-center justify-center gap-3"
        >
          <button
            v-if="canLoadPreviousRecommendations"
            class="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-on-background disabled:opacity-50"
            :disabled="pending"
            @click="loadPreviousRecommendations"
          >
            Load Previous Recommendations
          </button>
          <button
            v-if="canRetryRecommendations"
            class="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            :disabled="pending || retrySecondsLeft > 0"
            @click="retryRecommendations"
          >
            {{ retryButtonLabel }}
          </button>
        </div>
      </div>

      <div
        v-else-if="showRecommendationEmptyState"
        class="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center text-center text-on-surface-variant"
      >
        <p class="mb-2 text-2xl font-semibold text-on-background">You're all caught up</p>
        <p class="mb-6 text-sm uppercase tracking-[0.24em] text-on-surface-variant">
          Ready for another round?
        </p>
        <div
          class="flex w-full max-w-md items-center justify-center gap-3 max-[720px]:flex-col max-[720px]:[&>button]:w-full max-[390px]:flex-col max-[390px]:[&>button]:w-full"
        >
          <button
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-on-background disabled:opacity-50"
            :disabled="pending"
            @click="resetMovies"
          >
            Start Over
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-on-background disabled:opacity-50"
            :disabled="pending"
            @click="refreshMovies"
          >
            Refresh
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            :disabled="pending"
            @click="getNewMovies"
          >
            <svg
              class="h-4 w-4"
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

      <div v-else class="flex min-h-0 flex-1 items-center justify-center">
        <div
          class="mx-auto flex h-full min-h-0 w-full max-w-[82rem] items-center justify-center lg:pl-10 xl:pl-14"
        >
          <div
            class="flex h-full min-h-0 w-full flex-1 flex-col justify-center gap-6 [--card-non-poster-height:clamp(9.25rem,19dvh,12rem)] [--fit-safety:clamp(0.85rem,2dvh,1.5rem)] [--footer-clearance:clamp(0.65rem,1.75dvh,1.25rem)] [--footer-height:4rem] [--header-height:4rem] [--height-fit-width:calc((100dvh-var(--header-height)-var(--footer-height)-var(--page-vertical-padding)-var(--footer-clearance)-var(--card-non-poster-height)-var(--fit-safety))/1.5)] [--page-vertical-padding:1.5rem] sm:[--footer-height:4.25rem] sm:[--page-vertical-padding:2rem] max-[760px]:[--card-non-poster-height:clamp(7.85rem,17dvh,9.75rem)] max-[760px]:[--fit-safety:clamp(0.65rem,1.5dvh,1rem)] max-[760px]:[--footer-clearance:clamp(0.5rem,1.4dvh,0.85rem)] max-[680px]:[--card-non-poster-height:clamp(7rem,16dvh,8.65rem)] max-[680px]:[--fit-safety:0.65rem] max-[680px]:[--footer-clearance:0.5rem] lg:grid lg:grid-cols-[min(24.5rem,max(16rem,var(--height-fit-width)))_minmax(0,1fr)] lg:items-stretch lg:gap-16 xl:grid-cols-[min(25.5rem,max(16rem,var(--height-fit-width)))_minmax(0,1fr)] xl:gap-20"
          >
            <div
              class="mx-auto flex h-full min-h-0 w-[min(100%,29rem,max(16rem,var(--height-fit-width)))] max-h-full flex-col justify-center lg:mx-0 lg:w-full lg:max-w-none xl:max-w-none"
            >
              <div
                class="[container-type:inline-size] flex min-h-0 max-h-full w-full flex-1 flex-col justify-center px-[clamp(0.35rem,1vw,0.85rem)] py-[clamp(0.15rem,0.5vw,0.4rem)] sm:px-[0.35rem] lg:px-0 lg:py-0 max-[760px]:py-[0.1rem] max-[680px]:px-[0.75rem] max-[680px]:py-0"
              >
                <div
                  v-if="showInlineRecommendationFailure"
                  class="w-full text-center text-on-surface-variant"
                >
                  <AlertMessage type="error" :message="recommendationFailureMessage" />
                  <div
                    v-if="showRecommendationFailureActions"
                    class="mt-3 flex items-center justify-center gap-3"
                  >
                    <button
                      v-if="canLoadPreviousRecommendations"
                      class="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:border-primary/40 hover:text-on-background disabled:opacity-50"
                      :disabled="pending"
                      @click="loadPreviousRecommendations"
                    >
                      Load Previous Recommendations
                    </button>
                    <button
                      v-if="canRetryRecommendations"
                      class="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
                      :disabled="pending || retrySecondsLeft > 0"
                      @click="retryRecommendations"
                    >
                      {{ retryButtonLabel }}
                    </button>
                  </div>
                </div>

                <div class="min-h-0 w-full flex-1">
                  <Transition name="card" mode="out-in">
                    <MovieCard
                      v-if="currentMovieFormatted"
                      :key="currentMovieFormatted?.id"
                      :movie="currentMovieFormatted"
                      :is-in-my-list="isInMyList"
                      :is-watched="isWatched"
                      :poster-stack-count="remainingPosterStackCount"
                      :details-enabled="!isDesktopDetailsLayout"
                      @dislike="handleDislike"
                      @watched="handleLike"
                      @to-watch="handleAddToList"
                      @refresh="refreshMovies"
                    />
                  </Transition>
                </div>
              </div>
            </div>

            <div
              v-if="showDesktopDetailsPanel"
              class="hidden min-h-0 lg:flex lg:max-w-[48rem] lg:flex-col lg:py-[clamp(0.15rem,0.5vw,0.4rem)]"
            >
              <MovieDetails
                v-if="currentMovieDetails"
                :is-open="true"
                :movie="currentMovieDetails"
                variant="inline"
              />
              <div
                v-else
                class="flex h-full min-h-0 items-center justify-center rounded-[1.75rem] border border-outline-variant bg-surface-container-low px-8 text-center text-on-surface-variant shadow-glow"
              >
                Movie details are unavailable for this title.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LoginPromptModal :is-open="showLoginModal" @close="handleModalClose" />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed left-1/2 top-6 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-full border border-outline-variant bg-surface-container-lowest px-5 py-3 text-on-surface shadow-glow"
      >
        <span class="truncate text-sm">
          <strong>{{ undoAction.movie.title }}</strong>
          {{ undoAction.type === 'watched' ? 'marked as watched' : 'added to watchlist' }}
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

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const RECOMMENDATION_REFRESH_EVENT = 'recommendation:refresh-request'
const DESKTOP_DETAILS_BREAKPOINT_QUERY = '(min-width: 1024px)'
const FETCH_MODE = {
  DEFAULT: 'default',
  GET_NEW: 'getNew',
  REFRESH: 'refresh',
}

const RETRY_COOLDOWN_S = 30
const RETRY_COOLDOWN_KEY = 'retry-cooldown-expires'
const FALLBACK_RECOMMENDATION_ERROR_MESSAGE = 'Recommendations are unavailable right now.'
const MAX_POSTER_STACK_CARDS = 2

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

const movies = useState('recommendation-movies', () => [])
const originalMovies = useState('recommendation-original-movies', () => [])
const hasLoaded = useState('recommendation-has-loaded', () => false)
const hasSuccessfulRecommendationLoad = useState('has-successful-recommendation-load', () => false)
const recommendationsPending = ref(true)
const detailsPending = ref(false)
const pending = computed(() => recommendationsPending.value || detailsPending.value)
const showLoginModal = ref(false)
const recommendationFailure = ref(null)
const lastFetchMode = ref(FETCH_MODE.DEFAULT)
const pendingModalMovieId = ref(null)
const currentMovieDetails = useState('recommendation-current-movie-details', () => null)
const detailsRequestId = ref(0)
const retrySecondsLeft = ref(0)
const isDesktopDetailsLayout = ref(false)
let retryTimerHandle = null
let recommendationRefreshHandler = null
let desktopDetailsMediaQuery = null

function toRecommendationItems(recommendations) {
  return recommendations.flatMap((recommendation) => {
    if (
      typeof recommendation === 'number' &&
      Number.isInteger(recommendation) &&
      recommendation > 0
    ) {
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
  const message = candidates.find((candidate) => typeof candidate === 'string') ?? ''
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
const showDesktopDetailsPanel = computed(
  () => isDesktopDetailsLayout.value && currentMovieFormatted.value !== null
)
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
    rating: details?.rating ?? null,
    genre: details?.genres?.join(', ') ?? 'Unknown Genre',
    director: details?.directors?.[0] ?? null,
  }
})

const remainingPosterStackCount = computed(() =>
  Math.max(0, Math.min(MAX_POSTER_STACK_CARDS, movies.value.length - 1))
)

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

function syncDesktopDetailsLayout(mediaQuery) {
  isDesktopDetailsLayout.value = mediaQuery.matches
}

onMounted(() => {
  const stored = localStorage.getItem(RETRY_COOLDOWN_KEY)
  if (stored) {
    const expiresAt = Number(stored)
    if (Date.now() < expiresAt) {
      resumeRetryCooldown(expiresAt)
    } else {
      localStorage.removeItem(RETRY_COOLDOWN_KEY)
    }
  }

  recommendationRefreshHandler = () => {
    if (pending.value) return
    refreshMovies()
  }

  desktopDetailsMediaQuery = window.matchMedia(DESKTOP_DETAILS_BREAKPOINT_QUERY)
  syncDesktopDetailsLayout(desktopDetailsMediaQuery)
  desktopDetailsMediaQuery.addEventListener('change', syncDesktopDetailsLayout)
  window.addEventListener(RECOMMENDATION_REFRESH_EVENT, recommendationRefreshHandler)
})

onUnmounted(() => {
  if (retryTimerHandle !== null) clearInterval(retryTimerHandle)
  if (desktopDetailsMediaQuery !== null) {
    desktopDetailsMediaQuery.removeEventListener('change', syncDesktopDetailsLayout)
    desktopDetailsMediaQuery = null
  }
  if (recommendationRefreshHandler !== null) {
    window.removeEventListener(RECOMMENDATION_REFRESH_EVENT, recommendationRefreshHandler)
  }
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
