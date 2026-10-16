import cron, { type ScheduledTask } from 'node-cron'

import type { SettingsRepository } from '../../settings/application/ports/settings-repository.ts'
import type { SyncCoordinator } from '../application/sync-coordinator.ts'

export class DailyScheduler {
  private task: ScheduledTask | null = null

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly coordinator: SyncCoordinator
  ) {}

  configure(): void {
    this.task?.stop()
    this.task = null
    const settings = this.settingsRepository.get()
    if (!settings) throw new Error('La configuración no está inicializada.')
    const { enabled, time } = settings.schedule
    if (!enabled) return

    const [hour, minute] = time.split(':').map(Number)
    const expression = `${minute} ${hour} * * *`
    if (!cron.validate(expression))
      throw new Error(
        'La hora configurada genera una expresión de cron inválida.'
      )
    this.task = cron.schedule(
      expression,
      async () => {
        try {
          await this.coordinator.automatic()
        } catch (error) {
          console.error(
            '[scheduler] corrida automática fallida:',
            safeError(error)
          )
        }
      },
      {
        timezone: 'America/Caracas',
        noOverlap: true,
        name: 'cobrix-daily-sync',
      }
    )
  }

  close(): void {
    this.task?.stop()
    this.task = null
  }
}

function safeError(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 300)
    : 'Error desconocido.'
}
