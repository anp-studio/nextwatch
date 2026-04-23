const ADMIN_TOKEN_HEADER = 'x-admin-token'

function parseBool(val: unknown): boolean | undefined {
  const trueValues = ['true', '1']
  return typeof val === 'string' && trueValues.includes(String(val).toLowerCase())
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const token = getHeader(event, ADMIN_TOKEN_HEADER)
  const { fullRefreshQuery } = getQuery(event)
  const fullRefresh = parseBool(fullRefreshQuery)

  if (!token || token !== config.adminToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const result = await runTmdbImport({ fullRefresh })
  return result
})
