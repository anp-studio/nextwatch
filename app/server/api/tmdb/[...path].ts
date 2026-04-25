export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = event.context.params?.path as string | undefined

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'Path parameter is required',
    })
  }

  const tmdbQuery = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== null),
  ) as Record<string, string | string[] | number>

  return fetchTmdb(event, path, tmdbQuery)
})
