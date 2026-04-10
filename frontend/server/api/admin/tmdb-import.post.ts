const ADMIN_TOKEN_HEADER = 'x-admin-token'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const token = getHeader(event, ADMIN_TOKEN_HEADER)

  if (!token || token !== config.adminToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const result = await runTmdbImport()
  return result
})
