import { existsSync } from 'node:fs'
process.env.SANDBOX_TODAY ??= '2026-10-13'

import { DEFAULT_BILLING_API_DB, seedBillingApi } from './seed.ts'
import { createBillingApiServer } from './server.ts'

const databasePath = process.env.BILLING_API_DB ?? DEFAULT_BILLING_API_DB
const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.BILLING_API_PORT ?? 4310)

if (!existsSync(databasePath)) {
  seedBillingApi(databasePath)
}

const api = createBillingApiServer(databasePath)
await api.listen(port, host)
console.log(`API del administrador: http://${host}:${port}/api/v1`)
console.log(`Swagger:               http://${host}:${port}/docs`)

let closing = false
const shutdown = async (): Promise<void> => {
  if (closing) return
  closing = true
  await api.close()
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
