export interface HcaptchaVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  credit?: boolean
  'error-codes'?: string[]
}

interface VerifyHcaptchaOptions {
  token: string
  secret: string
  sitekey?: string
}

export class HcaptchaRequestError extends Error {
  constructor(
    message: string,
    public override cause: unknown
  ) {
    super(message)
    this.name = 'HcaptchaRequestError'
  }
}

const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify'

export async function verifyHcaptcha(
  options: VerifyHcaptchaOptions
): Promise<HcaptchaVerifyResponse> {
  const { token, secret, sitekey } = options
  const params = new URLSearchParams()
  params.set('response', token)
  params.set('secret', secret)

  if (sitekey) {
    params.set('sitekey', sitekey)
  }

  try {
    return await $fetch<HcaptchaVerifyResponse>(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  } catch (error) {
    throw new HcaptchaRequestError('Failed to send request to hCaptcha API', error)
  }
}
