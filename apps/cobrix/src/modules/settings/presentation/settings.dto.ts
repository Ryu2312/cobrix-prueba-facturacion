import type { Settings } from '../domain/settings.ts'

export interface SettingsResponseDto {
  readonly company: {
    readonly name: string
    readonly taxId: string
    readonly collectionEmail: string
  }
  readonly provider: {
    readonly baseUrl: string
    readonly username: string
    readonly passwordSet: boolean
  }
  readonly sync: {
    readonly statuses: readonly string[]
    readonly importWindowMonths: number | null
    readonly maxInstallmentsPerContract: number | null
    readonly graceDays: number
    readonly maxNewInvoices: number | null
    readonly maxNewAmount: number | null
    readonly excludedDocumentTypes: readonly string[]
    readonly scheduleEnabled: boolean
    readonly scheduleTime: string
  }
}

export function toSettingsResponseDto(settings: Settings): SettingsResponseDto {
  return {
    company: {
      name: settings.company.name ?? '',
      taxId: settings.company.taxId ?? '',
      collectionEmail: settings.company.collectionEmail?.value ?? '',
    },
    provider: {
      baseUrl: settings.isp.baseUrl,
      username: settings.isp.username,
      passwordSet: Boolean(settings.isp.password),
    },
    sync: {
      statuses: settings.importPolicy.statuses,
      importWindowMonths: settings.importPolicy.importWindowMonths,
      maxInstallmentsPerContract:
        settings.importPolicy.maxInstallmentsPerContract,
      graceDays: settings.importPolicy.graceDays,
      maxNewInvoices: settings.importPolicy.maxNewInvoices,
      maxNewAmount:
        settings.importPolicy.maxNewAmountMinorUnits === null
          ? null
          : settings.importPolicy.maxNewAmountMinorUnits / 100,
      excludedDocumentTypes: settings.importPolicy.excludedDocumentTypes,
      scheduleEnabled: settings.schedule.enabled,
      scheduleTime: settings.schedule.time,
    },
  }
}

export interface SettingsUpdateHttpDto {
  readonly company: {
    readonly name: string
    readonly taxId: string
    readonly collectionEmail: string
  }
  readonly provider: {
    readonly baseUrl: string
    readonly username: string
    readonly password?: string
  }
  readonly sync: {
    readonly statuses: readonly string[]
    readonly importWindowMonths: number | null
    readonly maxInstallmentsPerContract: number | null
    readonly graceDays: number
    readonly maxNewInvoices: number | null
    readonly maxNewAmount: number | null
    readonly excludedDocumentTypes: readonly string[]
    readonly scheduleEnabled: boolean
    readonly scheduleTime: string
  }
}
