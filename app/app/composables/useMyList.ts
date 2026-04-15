import type { MyListMovie, MoviePreview } from '~/types/movie'

export const useMyList = () => {
  const supabase = useSupabase()

  const myList = useState<MyListMovie[]>('my-list', () => [])

  const clearMyList = () => {
    myList.value = []
  }

  const syncMyListFromSupabase = async (accessToken?: string) => {
    try {
      let token = accessToken

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        token = session?.access_token
      }

      if (!token) {
        myList.value = []
        return
      }

      const response = await $fetch<{ success: boolean; movies: MyListMovie[] }>('/api/mylist', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      myList.value = response.movies
    } catch {
      // failed to load my list
    }
  }

  const addToMyList = async (
    movie: Pick<MoviePreview, 'id' | 'title' | 'year' | 'poster'>
  ): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      const path = posterPath(movie.poster)

      const alreadyInState = myList.value.some((m) => m.tmdbId === movie.id)
      if (!alreadyInState) {
        myList.value.push({
          tmdbId: movie.id,
          title: movie.title,
          year: movie.year,
          posterPath: path,
        })
      }

      try {
        await $fetch('/api/mylist', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            movie: {
              tmdbId: movie.id,
              title: movie.title,
              year: movie.year,
              posterPath: path,
            },
          },
        })
      } catch {
        if (!alreadyInState) {
          myList.value = myList.value.filter((m) => m.tmdbId !== movie.id)
        }
        return 'error'
      }
    } catch {
      return 'error'
    }

    return 'ok'
  }

  const removeFromMyList = async (tmdbId: number): Promise<'ok' | 'unauthorized' | 'error'> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return 'unauthorized'
      }

      myList.value = myList.value.filter((m) => m.tmdbId !== tmdbId)

      await $fetch('/api/mylist', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { tmdbId },
      })
    } catch {
      await syncMyListFromSupabase()
      return 'error'
    }

    return 'ok'
  }

  return {
    myList,
    addToMyList,
    removeFromMyList,
    syncMyListFromSupabase,
    clearMyList,
  }
}
