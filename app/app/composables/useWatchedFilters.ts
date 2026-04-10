import type { WatchedMovie, Movie } from '~/types/movie'

export type SortOption = 'default' | 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc'

export interface RuntimeRange {
  label: string
  min: number
  max: number
}

export const RUNTIME_RANGES: RuntimeRange[] = [
  { label: 'Under 90 min', min: 0, max: 89 },
  { label: '90–120 min', min: 90, max: 120 },
  { label: '120–150 min', min: 120, max: 150 },
  { label: 'Over 150 min', min: 151, max: Infinity },
]

export const useWatchedFilters = (watchedMovies: Ref<WatchedMovie[]>) => {
  const { getMovieDetails } = useMovieDetails()

  const searchQuery = ref('')
  const selectedGenres = ref<string[]>([])
  const selectedRuntime = ref<RuntimeRange | null>(null)
  const sortBy = ref<SortOption>('default')

  // Metadata enrichment: genres + runtime for movies that don't have it stored
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
      for (const g of getGenres(movie)) {
        genreSet.add(g)
      }
    }
    return [...genreSet].sort()
  })

  const filteredMovies = computed(() => {
    let result = [...watchedMovies.value]

    // Search by title
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter((m) => m.title.toLowerCase().includes(q))
    }

    // Genre filter
    if (selectedGenres.value.length > 0) {
      result = result.filter((m) => {
        const genres = getGenres(m)
        return selectedGenres.value.some((g) => genres.includes(g))
      })
    }

    // Runtime filter
    if (selectedRuntime.value) {
      const { min, max } = selectedRuntime.value
      result = result.filter((m) => {
        const runtime = getRuntime(m)
        if (runtime === null) return false
        return runtime >= min && runtime <= max
      })
    }

    // Sort
    if (sortBy.value !== 'default') {
      result.sort((a, b) => {
        switch (sortBy.value) {
          case 'title-asc':
            return a.title.localeCompare(b.title)
          case 'title-desc':
            return b.title.localeCompare(a.title)
          case 'year-desc':
            return b.year - a.year
          case 'year-asc':
            return a.year - b.year
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
      sortBy.value !== 'default'
    )
  })

  const clearFilters = () => {
    searchQuery.value = ''
    selectedGenres.value = []
    selectedRuntime.value = null
    sortBy.value = 'default'
  }

  const toggleGenre = (genre: string) => {
    const idx = selectedGenres.value.indexOf(genre)
    if (idx >= 0) {
      selectedGenres.value.splice(idx, 1)
    } else {
      selectedGenres.value.push(genre)
    }
  }

  // Backfill metadata for movies that don't have genres/runtime stored
  const fetchMissingMetadata = async () => {
    const missing = watchedMovies.value.filter(
      (m) => !m.genres?.length && !enrichedMap.value[m.tmdbId]
    )

    if (missing.length === 0) return

    isLoadingMetadata.value = true
    metadataProgress.value = { loaded: 0, total: missing.length }

    // Fetch in small batches to avoid overwhelming the API
    const BATCH_SIZE = 5
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((m) => getMovieDetails(m.tmdbId))
      )

      for (let j = 0; j < results.length; j++) {
        const result = results[j]!
        if (result.status === 'fulfilled') {
          const movie = result.value
          enrichedMap.value[batch[j]!.tmdbId] = {
            genres: movie.genres ?? [],
            runtime: movie.runtime ?? null,
          }
        }
      }

      metadataProgress.value = {
        loaded: Math.min(i + BATCH_SIZE, missing.length),
        total: missing.length,
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
    hasActiveFilters,
    isLoadingMetadata,
    metadataProgress,
    clearFilters,
    toggleGenre,
    fetchMissingMetadata,
    RUNTIME_RANGES,
  }
}
