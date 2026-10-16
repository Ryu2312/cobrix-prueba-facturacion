import { CompanySettings } from '../domain/company-settings.ts'
import { ImportPolicy } from '../domain/import-policy.ts'
import { IspConnection } from '../domain/isp-connection.ts'
import { Settings } from '../domain/settings.ts'
import {
  company,
  provider,
  syncSettings,
} from '../../../../drizzle/schema.drizzle.ts'
import { SyncSchedule } from '../domain/sync-schedule.ts'

export class SettingsMapper {
  static toPersistence(settings: Settings) {
    return {
      company: {
        name: settings.company.name ?? '',
        taxId: settings.company.taxId ?? '',
        collectionEmail: settings.company.collectionEmail?.value ?? '',
      },

      provider: {
        baseUrl: settings.isp.baseUrl,
        username: settings.isp.username,
        password: settings.isp.password,
      },

      sync: {
        statuses: JSON.stringify(settings.importPolicy.statuses),
        importWindowMonths: settings.importPolicy.importWindowMonths,
        maxInstallmentsPerContract:
          settings.importPolicy.maxInstallmentsPerContract,
        graceDays: settings.importPolicy.graceDays,
        maxNewInvoices: settings.importPolicy.maxNewInvoices,
        maxNewAmount:
          settings.importPolicy.maxNewAmountMinorUnits === null
            ? null
            : settings.importPolicy.maxNewAmountMinorUnits / 100,
        excludedDocumentTypes: JSON.stringify(
          settings.importPolicy.excludedDocumentTypes
        ),
        scheduleEnabled: settings.schedule.enabled,
        scheduleTime: settings.schedule.time,
      },
    }
  }

  static toDomain(raw: {
    companyRow: typeof company.$inferSelect
    providerRow: typeof provider.$inferSelect
    syncRow: typeof syncSettings.$inferSelect
  }): Settings {
    return Settings.create({
      company: CompanySettings.create({
        name: raw.companyRow.name || null,
        taxId: raw.companyRow.taxId || null,
        collectionEmail: raw.companyRow.collectionEmail || null,
      }),

      isp: IspConnection.create({
        baseUrl: raw.providerRow.baseUrl,
        username: raw.providerRow.username,
        password: raw.providerRow.password,
      }),

      importPolicy: ImportPolicy.create({
        statuses: parseJsonStringArray(raw.syncRow.statuses, 'estados'),
        importWindowMonths: raw.syncRow.importWindowMonths,
        maxInstallmentsPerContract: raw.syncRow.maxInstallmentsPerContract,
        graceDays: raw.syncRow.graceDays,
        maxNewInvoices: raw.syncRow.maxNewInvoices,
        maxNewAmountMinorUnits: toMinorUnits(raw.syncRow.maxNewAmount),
        excludedDocumentTypes: parseJsonStringArray(
          raw.syncRow.excludedDocumentTypes,
          'tipos excluidos'
        ),
      }),

      schedule: SyncSchedule.create({
        enabled: raw.syncRow.scheduleEnabled,
        time: raw.syncRow.scheduleTime,
      }),
    })
  }
}

function parseJsonStringArray(value: string, label: string): string[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`Configuración almacenada inválida: ${label}.`)
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every((entry) => typeof entry === 'string')
  ) {
    throw new Error(`Configuración almacenada inválida: ${label}.`)
  }

  return parsed
}

function toMinorUnits(amount: number | null): number | null {
  if (amount === null) return null

  const minorUnits = Math.round(amount * 100)

  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error('Configuración almacenada inválida: importe máximo.')
  }

  return minorUnits
}
