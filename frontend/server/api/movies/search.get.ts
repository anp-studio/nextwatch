export default defineEventHandler(async (event) => {
  const { q } = getQuery<{ q?: string }>(event)
  const results = await searchMovies(q ?? '')
  return { results }
})
