import type { FastifyInstance } from 'fastify'

import { InvalidValueError } from '../modules/shared/domain/domain-error.ts'
import { IspError } from '../modules/shared/infrastructure/isp-client.ts'
import { SyncConflictError } from '../modules/synchronization/application/sync-conflict-error.ts'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const validation = getValidationIssues(error)
    if (validation) {
      void reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos inválidos.',
        details: validation,
      })
      return
    }
    if (error instanceof SyncConflictError) {
      void reply
        .code(409)
        .send({ error: 'SYNC_CONFLICT', message: error.message })
      return
    }
    if (error instanceof IspError) {
      void reply.code(502).send({
        error: error.code,
        message: error.message,
        upstreamStatus: error.statusCode,
      })
      return
    }
    if (error instanceof InvalidValueError) {
      void reply
        .code(400)
        .send({ error: 'INVALID_SETTINGS', message: error.message })
      return
    }
    console.error(
      `[api] ${request.method} ${request.url} failed (${error instanceof Error ? error.name : 'UNKNOWN'})`
    )
    void reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno. Revisa el registro del servidor.',
    })
  })
}

function getValidationIssues(
  error: unknown
): Array<{ field: string; message: string }> | null {
  if (!isRecord(error) || !Array.isArray(error.validation)) return null
  return error.validation.map((entry: unknown) => {
    if (!isRecord(entry)) return { field: 'request', message: 'valor inválido' }
    const params = isRecord(entry.params) ? entry.params : undefined
    return {
      field:
        (typeof entry.instancePath === 'string' && entry.instancePath) ||
        (typeof params?.missingProperty === 'string' &&
          params.missingProperty) ||
        'request',
      message:
        typeof entry.message === 'string' ? entry.message : 'valor inválido',
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
