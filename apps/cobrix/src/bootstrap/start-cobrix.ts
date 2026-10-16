import type { FastifyInstance } from 'fastify'

import { createApi } from '../server.ts'
import {
  openDatabase,
  defaultDatabasePath,
} from '../modules/shared/infrastructure/database.ts'
import { seedSettings } from '../modules/settings/infrastructure/settings-seed.ts'
import { createServices, type CobrixServices } from './create-services.ts'

export async function startCobrix(): Promise<void> {
  const host = process.env.HOST ?? '127.0.0.1'
  const port = Number(process.env.COBRIX_PORT ?? 4320)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('COBRIX_PORT debe ser un puerto entre 1 y 65535.')

  let database: ReturnType<typeof openDatabase> | undefined
  let services: CobrixServices | undefined
  let app: FastifyInstance | undefined

  try {
    database = openDatabase()
    services = createServices(database.db)
    seedSettings(services.settingsRepository, {
      providerUrl: process.env.ISP_API_URL,
      providerUsername: process.env.ISP_USERNAME,
      providerPassword: process.env.ISP_PASSWORD,
    })
    services.scheduler.configure()
    app = createApi(services)

    await app.listen({ host, port })
    console.log(`API Cobrix disponible en http://${host}:${port}`)
    console.log(`Base de datos propia: ${defaultDatabasePath()}`)
  } catch (error) {
    try {
      await closeResources(app, services, database)
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Falló el inicio de Cobrix y también la liberación de recursos.'
      )
    }
    throw error
  }

  let shutdownPromise: Promise<void> | undefined
  const shutdown = (): Promise<void> => {
    shutdownPromise ??= closeResources(app, services, database)
    return shutdownPromise
  }
  const handleSignal = (): void => {
    void shutdown().catch((error: unknown) => {
      console.error(
        `No se pudo cerrar Cobrix limpiamente: ${formatError(error)}`
      )
      process.exitCode = 1
    })
  }

  process.once('SIGINT', handleSignal)
  process.once('SIGTERM', handleSignal)
}

async function closeResources(
  app: FastifyInstance | undefined,
  services: CobrixServices | undefined,
  database: ReturnType<typeof openDatabase> | undefined
): Promise<void> {
  const errors: unknown[] = []

  try {
    services?.scheduler.close()
  } catch (error) {
    errors.push(error)
  }

  try {
    await app?.close()
  } catch (error) {
    errors.push(error)
  }

  try {
    database?.close()
  } catch (error) {
    errors.push(error)
  }

  if (errors.length > 0)
    throw new AggregateError(
      errors,
      'No se pudieron liberar todos los recursos.'
    )
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'error desconocido'
}
