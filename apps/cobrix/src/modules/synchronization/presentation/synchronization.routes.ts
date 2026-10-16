import type { FastifyInstance } from 'fastify'

import type { SyncCoordinator } from '../application/sync-coordinator.ts'
import type { GetRunUseCase } from '../application/use-cases/get-run.ts'
import { toRunDetailsResponseDto } from './runs.dto.ts'

const operationBodySchema = {
  type: 'object',
  properties: { simulation: { type: 'boolean', default: false } },
  additionalProperties: false,
} as const

interface OperationBody {
  readonly simulation?: boolean
}

export class SynchronizationRoutes {
  constructor(
    private readonly coordinator: SyncCoordinator,
    private readonly getRun: GetRunUseCase
  ) {}

  register(app: FastifyInstance): void {
    app.post<{ Body: OperationBody }>(
      '/api/sync/import',
      { schema: { body: operationBodySchema } },
      async (request, reply) => {
        const runId = await this.coordinator.import(
          request.body.simulation ?? false
        )
        const run = this.getRun.execute(runId)
        if (!run) throw new Error('No se encontró la corrida recién creada.')
        return reply.code(202).send(toRunDetailsResponseDto(run))
      }
    )

    app.post<{ Body: OperationBody }>(
      '/api/sync/reconcile',
      { schema: { body: operationBodySchema } },
      async (request, reply) => {
        const runId = await this.coordinator.reconcile(
          request.body.simulation ?? false
        )
        const run = this.getRun.execute(runId)
        if (!run) throw new Error('No se encontró la corrida recién creada.')
        return reply.code(202).send(toRunDetailsResponseDto(run))
      }
    )
  }
}
