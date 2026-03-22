import { createClient } from '@libsql/client'
import { resolve } from 'node:path'
import type { Client } from '@libsql/client'

const DEFAULT_URL = `file:${resolve(process.cwd(), '../database/local.db')}`

let _client: Client | null = null

export function useDb(): Client {
  if (_client) return _client

  const config = useRuntimeConfig()
  const url = (config.libsqlUrl as string) || DEFAULT_URL
  const authToken = (config.libsqlAuthToken as string) || undefined

  _client = createClient({ url, authToken })
  return _client
}
