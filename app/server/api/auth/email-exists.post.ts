import { checkAuthEmailExists } from '../../utils/auth/signup'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALIDATION_STATUS_CODE = 400

interface EmailExistsRequestBody {
  email?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<EmailExistsRequestBody>(event)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (!EMAIL_PATTERN.test(email)) {
    throw createError({
      statusCode: VALIDATION_STATUS_CODE,
      statusMessage: 'Email is invalid.',
    })
  }

  const exists = await checkAuthEmailExists(event, email)

  return { exists }
})
