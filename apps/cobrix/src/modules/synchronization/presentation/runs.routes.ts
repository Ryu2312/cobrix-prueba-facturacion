import type { FastifyInstance } from 'fastify'

import type { GetRunUseCase } from '../application/use-cases/get-run.ts'
import type { ListRunsUseCase } from '../application/use-cases/list-runs.ts'
import { toRunDetailsResponseDto, toRunResponseDto } from './runs.dto.ts'

const runParamsSchema = {
  type: 'object',
  properties: { id: { type: 'integer', minimum: 1 } },
  required: ['id'],
  additionalProperties: false,
} as const

export class RunsRoutes {
  constructor(
    private readonly listRuns: ListRunsUseCase,
    private readonly getRun: GetRunUseCase
  ) {}

  register(app: FastifyInstance): void {
    app.get('/api/runs', async () =>
      this.listRuns.execute().map(toRunResponseDto)
    )
    app.get<{ Params: { readonly id: number } }>(
      '/api/runs/:id',
      { schema: { params: runParamsSchema } },
      async (request, reply) => {
        const run = this.getRun.execute(request.params.id)
        if (!run)
          return reply
            .code(404)
            .send({ error: 'NOT_FOUND', message: 'No se encontró la corrida.' })
        return toRunDetailsResponseDto(run)
      }
    )
  }
}
