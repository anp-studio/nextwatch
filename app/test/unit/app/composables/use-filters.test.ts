import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useFilters } from '../../../../app/composables/useFilters'

const movies = [
  {
    tmdbId: 1,
    title: 'Action Drama',
    year: 2020,
    genres: ['Action', 'Drama'],
    runtime: 95,
    rating: 8.1,
  },
  {
    tmdbId: 2,
    title: 'Quiet Romance',
    year: 1998,
    genres: ['Romance'],
    runtime: 121,
    rating: 7.2,
  },
  {
    tmdbId: 3,
    title: 'Epic Action',
    year: 2010,
    genres: ['Action', 'Adventure'],
    runtime: 151,
    rating: 6.8,
  },
]

describe('useFilters', () => {
  it('filters by search query', () => {
    const filters = useFilters(ref(movies))

    filters.searchQuery.value = 'quiet'

    expect(filters.filteredMovies.value.map((movie) => movie.tmdbId)).toEqual([2])
  })

  it('requires all selected genres to match', () => {
    const filters = useFilters(ref(movies))

    filters.toggleGenre('Action')
    filters.toggleGenre('Drama')

    expect(filters.filteredMovies.value.map((movie) => movie.tmdbId)).toEqual([1])
  })

  it('filters by runtime range', () => {
    const filters = useFilters(ref(movies))

    filters.selectedRuntime.value = filters.runtimeRanges[1] ?? null

    expect(filters.filteredMovies.value.map((movie) => movie.tmdbId)).toEqual([1])
  })

  it('filters by minimum rating when enabled', () => {
    const filters = useFilters(ref(movies), { enableRating: true })

    filters.minRating.value = 8

    expect(filters.filteredMovies.value.map((movie) => movie.tmdbId)).toEqual([1])
  })

  it('sorts by release year ascending', () => {
    const filters = useFilters(ref(movies))

    filters.sortBy.value = 'year-asc'

    expect(filters.filteredMovies.value.map((movie) => movie.tmdbId)).toEqual([2, 3, 1])
  })

  it('clears every active filter back to defaults', () => {
    const filters = useFilters(ref(movies), { enableRating: true })

    filters.searchQuery.value = 'action'
    filters.toggleGenre('Action')
    filters.selectedRuntime.value = filters.runtimeRanges[0] ?? null
    filters.minRating.value = 7
    filters.sortBy.value = 'title-desc'

    filters.clearFilters()

    expect(filters.searchQuery.value).toBe('')
    expect(filters.selectedGenres.value).toEqual([])
    expect(filters.selectedRuntime.value).toBeNull()
    expect(filters.minRating.value).toBeNull()
    expect(filters.sortBy.value).toBe('default')
  })
})
