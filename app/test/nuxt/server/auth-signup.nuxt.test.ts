import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, createError, defineEventHandler, readBody, toNodeListener } from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  serviceRpcMock,
  signUpMock,
  verifyHcaptchaMock,
} =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    serviceRpcMock: vi.fn(),
    signUpMock: vi.fn(),
    verifyHcaptchaMock: vi.fn(),
  }))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

vi.mock('../../../server/utils/auth/hcaptcha', () => ({
  verifyHcaptcha: verifyHcaptchaMock,
}))

Object.assign(globalThis, {
  createError,
  defineEventHandler,
  readBody,
  useRuntimeConfig: vi.fn(() => ({
    hcaptchaSecretKey: 'test-hcaptcha-secret',
    public: {
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'test-supabase-key',
      hcaptchaSiteKey: 'test-hcaptcha-key',
    },
    supabaseServiceRoleKey: 'test-service-role-key',
  })),
})

const { default: signupHandler } = await import('../../../server/api/auth/signup.post')

const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'new@example.com',
}
const TEST_SESSION = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
}
const EMAIL_ALREADY_REGISTERED_CODE = 'EMAIL_ALREADY_REGISTERED'

function createSignupBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: ' New@Example.com ',
    password: 'password123',
    username: ' Test ',
    captchaToken: 'real-hcaptcha-token',
    ...overrides,
  }
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('/api/auth/signup', () => {
  const app = createApp()
  app.use('/api/auth/signup', signupHandler)

  let baseUrl = ''
  let server: Server

  beforeAll(async () => {
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  beforeEach(() => {
    serviceRpcMock.mockResolvedValue({ data: false, error: null })
    signUpMock.mockResolvedValue({
      data: {
        user: TEST_USER,
        session: TEST_SESSION,
      },
      error: null,
    })
    verifyHcaptchaMock.mockResolvedValue({ success: true })
    createClientMock.mockImplementation((_supabaseUrl: string, supabaseKey: string) => {
      if (supabaseKey === 'test-service-role-key') {
        return {
          rpc: serviceRpcMock,
        }
      }

      return {
        auth: {
          signUp: signUpMock,
        },
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid email before checking Supabase', async () => {
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSignupBody({ email: 'invalid-email' })),
    })

    expect(response.status).toBe(400)
    expect(serviceRpcMock).not.toHaveBeenCalled()
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('requires a captcha token before checking Supabase', async () => {
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSignupBody({ captchaToken: ' ' })),
    })

    expect(response.status).toBe(400)
    expect(serviceRpcMock).not.toHaveBeenCalled()
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('returns a conflict and skips signup when the email already exists', async () => {
    serviceRpcMock.mockResolvedValue({ data: true, error: null })

    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSignupBody()),
    })
    const body = await readJson(response)
    const errorData = body.data as Record<string, unknown>

    expect(response.status).toBe(409)
    expect(errorData.code).toBe(EMAIL_ALREADY_REGISTERED_CODE)
    expect(serviceRpcMock).toHaveBeenCalledWith('auth_email_exists', {
      target_email: 'new@example.com',
    })
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('trims signup fields and creates the user through regular Supabase auth', async () => {
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSignupBody()),
    })
    const body = await readJson(response)

    expect(response.status).toBe(200)
    expect(body.user).toEqual(TEST_USER)
    expect(body.session).toEqual(TEST_SESSION)
    expect(serviceRpcMock).toHaveBeenCalledWith('auth_email_exists', {
      target_email: 'new@example.com',
    })
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'Test',
        },
      },
    })
  })

  it('logs Supabase signup errors and returns a generic public API error', async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: {
        message: 'Weak password',
        status: 422,
      },
    })

    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSignupBody()),
    })
    const body = await readJson(response)

    expect(response.status).toBe(500)
    expect(body.statusMessage).toBe('Unable to create account.')
  })
})
