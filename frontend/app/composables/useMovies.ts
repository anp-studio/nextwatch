export interface Movie {
  id: number
  title: string
  poster: string
  rating: number
  year: number
  duration: string
  genres: string[]
  actors: string[]
  description: string
}

export const useMovies = () => {
  // treba izmeniti ovo je samo mock
  const movies = useState<Movie[]>('movies', () => [
    {
      id: 1,
      title: 'Inception',
      poster: 'https://image.tmdb.org/t/p/w500/9gk7admal4zl67YrxIo16EOzoGO.jpg',
      rating: 8.8,
      year: 2010,
      duration: '2h 28m',
      genres: ['Sci-Fi', 'Action'],
      actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'],
      description:
        'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    },
    {
      id: 2,
      title: 'The Dark Knight',
      poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      rating: 9.0,
      year: 2008,
      duration: '2h 32m',
      genres: ['Action', 'Crime'],
      actors: ['Christian Bale', 'Heath Ledger'],
      description:
        'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    },
    {
      id: 3,
      title: 'Interstellar',
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniL6C8zt6bOSdyTDrJwAKt.jpg',
      rating: 8.6,
      year: 2014,
      duration: '2h 49m',
      genres: ['Adventure', 'Drama'],
      actors: ['Matthew McConaughey', 'Anne Hathaway'],
      description:
        "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    },
  ])

  const watchedMovies = useState<Movie[]>('watched', () => [])

  const markAsWatched = (movie: Movie) => {
    watchedMovies.value.push(movie)
    //zvatu supabase
  }

  return { movies, watchedMovies, markAsWatched }
}
