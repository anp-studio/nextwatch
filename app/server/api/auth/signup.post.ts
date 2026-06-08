import {
  checkAuthEmailExists,
  createEmailAlreadyRegisteredError,
  signupWithSupabase,
  validateSignupPayload,
  verifySignupCaptcha,
} from '../../utils/auth/signup'

export default defineEventHandler(async (event) => {
  const payload = validateSignupPayload(await readBody<unknown>(event))

  await verifySignupCaptcha(event, payload.captchaToken)

  if (await checkAuthEmailExists(event, payload.email)) {
    throw createEmailAlreadyRegisteredError()
  }

  return signupWithSupabase(event, payload)
})
