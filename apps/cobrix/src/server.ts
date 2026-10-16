import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts'

import type { CobrixServices } from './bootstrap/create-services.ts'
import { registerErrorHandler } from './api/error-handler.ts'
import { registerRoutes } from './api/register-routes.ts'

export function createApi(services: CobrixServices): FastifyInstance {
  const app = Fastify({
    logger: false,
  }).withTypeProvider<JsonSchemaToTsProvider>()
  configureCors(app)
  registerErrorHandler(app)
  registerRoutes(app, services)
  return app
}

function configureCors(app: FastifyInstance): void {
  const allowedOrigins = new Set([
    'http://127.0.0.1:4300',
    'http://localhost:4300',
    process.env.WEB_ORIGIN ?? 'http://127.0.0.1:4300',
  ])

  void app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) callback(null, true)
      else callback(new Error('Origen no permitido.'), false)
    },
  })
}
