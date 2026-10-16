import type { FastifyInstance } from 'fastify'

import { InvalidValueError } from '../../shared/domain/domain-error.ts'
import type { GetSettingsUseCase } from '../application/use-cases/get-settings.ts'
import type { TestIspConnectionUseCase } from '../application/use-cases/test-isp-connection.ts'
import type { UpdateSettingsUseCase } from '../application/use-cases/update-settings.ts'
import {
  toSettingsResponseDto,
  type SettingsUpdateHttpDto,
} from './settings.dto.ts'
import { settingsUpdateSchema } from './settings.schema.ts'

export class SettingsRoutes {
  constructor(
    private readonly getSettings: GetSettingsUseCase,
    private readonly updateSettings: UpdateSettingsUseCase,
    private readonly testIspConnection: TestIspConnectionUseCase,
    private readonly afterUpdate: () => void
  ) {}

  register(app: FastifyInstance): void {
    app.get('/api/settings', async () =>
      toSettingsResponseDto(this.getSettings.execute())
    )

    app.put<{ Body: SettingsUpdateHttpDto }>(
      '/api/settings',
      { schema: { body: settingsUpdateSchema } },
      async (request, reply) => {
        try {
          this.updateSettings.execute(request.body)
          this.afterUpdate()

          return reply.code(200).send({ ok: true })
        } catch (error) {
          if (error instanceof InvalidValueError)
            return reply.code(400).send({
              error: 'INVALID_SETTINGS',
              message: error.message,
            })
          throw error
        }
      }
    )

    app.post('/api/provider/test', async () => ({
      ok: true,
      contractCount: await this.testIspConnection.execute(),
    }))
  }
}
