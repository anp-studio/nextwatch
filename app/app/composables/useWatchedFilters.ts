import type { WatchedMovie } from '~/types/movie'

export type SortOption = 'default' | 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc'

export interface RuntimeRange {
  label: string
  min: number
  max: number
}

const METADATA_BATCH_SIZE = 5
const DEFAULT_SORT: SortOption = 'default'

export const RUNTIME_RANGES: RuntimeRange[] = [
  { label: 'Under 90 min', min: 0, max: 89 },
  { label: '90-120 min', min: 90, max: 120 },
  { label: '120-150 min', min: 120, max: 150 },
  { label: 'Over 150 min', min: 151, max: Infinity },
]

export const WATCHED_SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  'title-asc': 'Title A-Z',
  'title-desc': 'Title Z-A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

export const useWatchedFilters = (watchedMovies: Ref<WatchedMovie[]>) => {
  const { getMovieDetails } = useMovieDetails()

  const searchQuery = ref('')
  const selectedGenres = ref<string[]>([])
  const selectedRuntime = ref<RuntimeRange | null>(null)
  const sortBy = ref<SortOption>(DEFAULT_SORT)

  const enrichedMap = ref<Record<number, { genres: string[]; runtime: number | null }>>({})
  const isLoadingMetadata = ref(false)
  const metadataProgress = ref({ loaded: 0, total: 0 })

  const getGenres = (movie: WatchedMovie): string[] => {
    return movie.genres ?? enrichedMap.value[movie.tmdbId]?.genres ?? []
  }

  const getRuntime = (movie: WatchedMovie): number | null => {
    return movie.runtime ?? enrichedMap.value[movie.tmdbId]?.runtime ?? null
  }

  const availableGenres = computed(() => {
    const genreSet = new Set<string>()

    for (const movie of watchedMovies.value) {
      for (const genre of getGenres(movie)) {
        genreSet.add(genre)
      }
    }

    return [...genreSet].sort()
  })

  const filteredMovies = computed(() => {
    let result = [...watchedMovies.value]

    if (searchQuery.value.trim()) {
      const normalizedQuery = searchQuery.value.trim().toLowerCase()
      result = result.filter((movie) => movie.title.toLowerCase().includes(normalizedQuery))
    }

    if (selectedGenres.value.length > 0) {
      result = result.filter((movie) => {
        const genres = getGenres(movie)
        return selectedGenres.value.some((genre) => genres.includes(genre))
      })
    }

    if (selectedRuntime.value) {
      const { min, max } = selectedRuntime.value
      result = result.filter((movie) => {
        const runtime = getRuntime(movie)

        if (runtime === null) {
          return false
        }

        return runtime >= min && runtime <= max
      })
    }

    if (sortBy.value !== DEFAULT_SORT) {
      result.sort((firstMovie, secondMovie) => {
        switch (sortBy.value) {
          case 'title-asc':
            return firstMovie.title.localeCompare(secondMovie.title)
          case 'title-desc':
            return secondMovie.title.localeCompare(firstMovie.title)
          case 'year-desc':
            return secondMovie.year - firstMovie.year
          case 'year-asc':
            return firstMovie.year - secondMovie.year
          default:
            return 0
        }
      })
    }

    return result
  })

  const hasActiveFilters = computed(() => {
    return (
      searchQuery.value.trim() !== '' ||
      selectedGenres.value.length > 0 ||
      selectedRuntime.value !== null ||
      sortBy.value !== DEFAULT_SORT
    )
  })

  const clearFilters = () => {
    searchQuery.value = ''
    selectedGenres.value = []
    selectedRuntime.value = null
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

  const fetchMissingMetadata = async () => {
    const missingMovies = watchedMovies.value.filter(
      (movie) => !movie.genres?.length && !enrichedMap.value[movie.tmdbId]
    )

    if (missingMovies.length === 0) {
      return
    }

    isLoadingMetadata.value = true
    metadataProgress.value = { loaded: 0, total: missingMovies.length }

    for (let index = 0; index < missingMovies.length; index += METADATA_BATCH_SIZE) {
      const batch = missingMovies.slice(index, index + METADATA_BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((movie) => getMovieDetails(movie.tmdbId)))

      for (let batchIndex = 0; batchIndex < results.length; batchIndex++) {
        const result = results[batchIndex]

        if (result?.status !== 'fulfilled') {
          continue
        }

        const movie = batch[batchIndex]

        if (!movie) {
          continue
        }

        enrichedMap.value[movie.tmdbId] = {
          genres: result.value.genres ?? [],
          runtime: result.value.runtime ?? null,
        }
      }

      metadataProgress.value = {
        loaded: Math.min(index + METADATA_BATCH_SIZE, missingMovies.length),
        total: missingMovies.length,
      }
    }

    isLoadingMetadata.value = false
  }

  return {
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
  }
}
