import { InvalidValueError } from '../../../shared/domain/domain-error.ts'
import { SettingsFactory } from '../../domain/settings-factory.ts'
import type { SettingsRepository } from '../ports/settings-repository.ts'

export interface UpdateSettingsCommand {
  company: {
    name: string
    taxId: string
    collectionEmail: string
  }

  provider: {
    baseUrl: string
    username: string
    password?: string
  }

  sync: {
    statuses: readonly string[]
    importWindowMonths: number | null
    maxInstallmentsPerContract: number | null
    graceDays: number
    maxNewInvoices: number | null
    maxNewAmount: number | null
    excludedDocumentTypes: readonly string[]
    scheduleEnabled: boolean
    scheduleTime: string
  }
}

export class UpdateSettingsUseCase {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  execute(command: UpdateSettingsCommand): void {
    const current = this.settingsRepository.get()

    if (!current) {
      throw new InvalidValueError('La configuración no está inicializada.')
    }

    const settings = SettingsFactory.create({
      company: command.company,
      isp: {
        baseUrl: command.provider.baseUrl,
        username: command.provider.username,
        password: command.provider.password?.trim() || current.isp.password,
      },
      importPolicy: {
        statuses: command.sync.statuses,
        importWindowMonths: command.sync.importWindowMonths,
        maxInstallmentsPerContract: command.sync.maxInstallmentsPerContract,
        graceDays: command.sync.graceDays,
        maxNewInvoices: command.sync.maxNewInvoices,
        maxNewAmountMinorUnits:
          command.sync.maxNewAmount === null
            ? null
            : toMinorUnits(command.sync.maxNewAmount),
        excludedDocumentTypes: command.sync.excludedDocumentTypes,
      },
      schedule: {
        enabled: command.sync.scheduleEnabled,
        time: command.sync.scheduleTime,
      },
    })

    this.settingsRepository.save(settings)
  }
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}
