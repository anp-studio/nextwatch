export default defineEventHandler(async (event) => {
  const path = event.path

  if (!path.startsWith('/api/admin')) {
    return
  }

  // check auth
  const headers = getRequestHeaders(event)
  const providedToken = headers['x-admin-token'] as string | undefined

  console.log('[adminAuth] All headers received:', JSON.stringify(headers))
  console.log('[adminAuth] x-admin-token value:', providedToken)

  const validToken = process.env.ADMIN_API_TOKEN

  console.log(
    '[adminAuth] ADMIN_API_TOKEN from env:',
    validToken ? `${validToken.substring(0, 8)}...` : 'NOT SET'
  )

  if (!validToken) {
    console.error('ADMIN_API_TOKEN environment variable is not set')
    throw createError({
      statusCode: 500,
      message: 'Server configuration error',
    })
  }

  if (!providedToken || providedToken !== validToken) {
    console.warn(`Admin authentication failed for path: ${path}`)
    throw createError({
      statusCode: 403,
      message: 'Forbidden: Invalid or missing admin token',
    })
  }

  console.log(`Admin access granted for path: ${path}`)
})
