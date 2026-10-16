import type { SettingsRepository } from '../application/ports/settings-repository.ts'
import { SettingsFactory } from '../domain/settings-factory.ts'

export interface SettingsSeedEnvironment {
  readonly providerUrl?: string
  readonly providerUsername?: string
  readonly providerPassword?: string
}

export function seedSettings(
  repository: SettingsRepository,
  environment: SettingsSeedEnvironment = {}
): void {
  if (repository.get()) return

  const settings = SettingsFactory.create({
    company: {
      name: null,
      taxId: null,
      collectionEmail: null,
    },
    isp: {
      baseUrl: environment.providerUrl ?? 'http://127.0.0.1:4310',
      username: environment.providerUsername ?? 'cobrix',
      password: environment.providerPassword ?? 'cobrix-sandbox',
    },
    importPolicy: {
      statuses: ['ACTIVO', 'CORTADO'],
      importWindowMonths: null,
      maxInstallmentsPerContract: null,
      graceDays: 0,
      maxNewInvoices: null,
      maxNewAmountMinorUnits: null,
      excludedDocumentTypes: [],
    },
    schedule: {
      enabled: false,
      time: '02:00',
    },
  })

  repository.create(settings)
}
