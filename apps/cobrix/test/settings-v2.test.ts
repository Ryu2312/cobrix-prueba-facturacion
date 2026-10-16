import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { openDatabase } from '../src/modules/shared/infrastructure/database.ts'
import { InvalidValueError } from '../src/modules/shared/domain/domain-error.ts'
import type { SettingsRepository } from '../src/modules/settings/application/ports/settings-repository.ts'
import { TestIspConnectionUseCase } from '../src/modules/settings/application/use-cases/test-isp-connection.ts'
import { UpdateSettingsUseCase } from '../src/modules/settings/application/use-cases/update-settings.ts'
import { CompanySettings } from '../src/modules/settings/domain/company-settings.ts'
import { ImportPolicy } from '../src/modules/settings/domain/import-policy.ts'
import { SettingsFactory } from '../src/modules/settings/domain/settings-factory.ts'
import { Settings } from '../src/modules/settings/domain/settings.ts'
import { IspConnection } from '../src/modules/settings/domain/isp-connection.ts'
import { SyncSchedule } from '../src/modules/settings/domain/sync-schedule.ts'
import { SqliteSettingsRepository } from '../src/modules/settings/infrastructure/sqlite-settings-repository.ts'
import { seedSettings } from '../src/modules/settings/infrastructure/settings-seed.ts'

function createSettings(): Settings {
  return SettingsFactory.create({
    company: {
      name: 'Cobrix',
      taxId: 'J-123',
      collectionEmail: 'ops@example.test',
    },
    isp: {
      baseUrl: 'https://isp.example.test/api/v1',
      username: 'operator',
      password: 'secret',
    },
    importPolicy: {
      statuses: ['ACTIVO', 'CORTADO'],
      importWindowMonths: 3,
      maxInstallmentsPerContract: 12,
      graceDays: 5,
      maxNewInvoices: 100,
      maxNewAmountMinorUnits: 250000,
      excludedDocumentTypes: ['G'],
    },
    schedule: { enabled: true, time: '02:30' },
  })
}

describe('Settings V2', () => {
  it('permite nombre y RIF ausentes hasta que se configuren', () => {
    const settings = SettingsFactory.create({
      company: { name: null, taxId: null, collectionEmail: null },
      isp: {
        baseUrl: 'http://127.0.0.1:4310',
        username: 'cobrix',
        password: 'cobrix-sandbox',
      },
      importPolicy: {
        statuses: ['ACTIVO'],
        importWindowMonths: null,
        maxInstallmentsPerContract: null,
        graceDays: 0,
        maxNewInvoices: null,
        maxNewAmountMinorUnits: null,
        excludedDocumentTypes: [],
      },
      schedule: { enabled: false, time: '02:00' },
    })

    expect(settings.company.name).toBeNull()
    expect(settings.company.taxId).toBeNull()
    expect(settings.company.collectionEmail).toBeNull()
  })

  it('valida los valores de dominio al crear Settings', () => {
    expect(() =>
      CompanySettings.create({
        name: 'x'.repeat(151),
        taxId: null,
        collectionEmail: null,
      })
    ).toThrow(InvalidValueError)
    expect(() =>
      CompanySettings.create({
        name: null,
        taxId: null,
        collectionEmail: 'correo-invalido',
      })
    ).toThrow(InvalidValueError)
    expect(() =>
      IspConnection.create({
        baseUrl: 'file:///tmp/isp.sqlite',
        username: 'operator',
        password: 'secret',
      })
    ).toThrow(InvalidValueError)
    expect(() =>
      ImportPolicy.create({
        statuses: ['DESCONOCIDO'],
        importWindowMonths: null,
        maxInstallmentsPerContract: null,
        graceDays: 0,
        maxNewInvoices: null,
        maxNewAmountMinorUnits: null,
        excludedDocumentTypes: [],
      })
    ).toThrow(InvalidValueError)
    expect(() => SyncSchedule.create({ enabled: true, time: '25:00' })).toThrow(
      InvalidValueError
    )
  })

  it('actualiza toda la configuración y conserva una contraseña omitida', () => {
    const current = createSettings()
    const saved: Settings[] = []
    const repository: SettingsRepository = {
      get: () => current,
      create: () => undefined,
      save: (settings) => {
        saved.push(settings)
      },
    }

    new UpdateSettingsUseCase(repository).execute({
      company: {
        name: 'Cobrix actualizado',
        taxId: 'J-123',
        collectionEmail: 'ops@example.test',
      },
      provider: {
        baseUrl: current.isp.baseUrl,
        username: current.isp.username,
      },
      sync: {
        statuses: current.importPolicy.statuses,
        importWindowMonths: null,
        maxInstallmentsPerContract: null,
        graceDays: 5,
        maxNewInvoices: null,
        maxNewAmount: null,
        excludedDocumentTypes: current.importPolicy.excludedDocumentTypes,
        scheduleEnabled: false,
        scheduleTime: current.schedule.time,
      },
    })

    const savedSettings = saved[0]
    expect(savedSettings?.isp.password).toBe('secret')
    expect(savedSettings?.company.name).toBe('Cobrix actualizado')
    expect(savedSettings?.importPolicy.importWindowMonths).toBeNull()
    expect(savedSettings?.importPolicy.maxInstallmentsPerContract).toBeNull()
    expect(savedSettings?.importPolicy.maxNewAmountMinorUnits).toBeNull()
    expect(savedSettings?.schedule.enabled).toBe(false)
    expect(current.importPolicy.importWindowMonths).toBe(3)
    expect(current.schedule.enabled).toBe(true)
  })

  it('el caso de uso de conexión devuelve solo el número de contratos', async () => {
    const settings = createSettings()
    const repository: SettingsRepository = {
      get: () => settings,
      create: () => undefined,
      save: () => undefined,
    }
    const useCase = new TestIspConnectionUseCase(repository, {
      test: async () => 27,
    })

    await expect(useCase.execute()).resolves.toBe(27)
  })

  it('siembra defaults una sola vez sin sustituir valores ausentes por datos ficticios', () => {
    const state: { settings: Settings | null } = { settings: null }
    let saves = 0
    const repository: SettingsRepository = {
      get: () => state.settings,
      create: (settings) => {
        saves++
        state.settings = settings
      },
      save: (settings) => {
        state.settings = settings
      },
    }

    seedSettings(repository, {
      providerUrl: 'https://isp.example.test',
      providerUsername: 'operator',
      providerPassword: 'seed-secret',
    })
    const seeded = state.settings
    seedSettings(repository)

    expect(seeded?.company.name).toBeNull()
    expect(seeded?.company.taxId).toBeNull()
    expect(seeded?.isp.password).toBe('seed-secret')
    expect(state.settings).toBe(seeded)
    expect(saves).toBe(1)
  })

  it('el repositorio hidrata y guarda el agregado validado', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cobrix-settings-v2-'))
    const database = openDatabase({
      path: join(directory, 'cobrix.sqlite'),
      migrationsFolder: join(process.cwd(), 'drizzle', 'migrations'),
    })
    try {
      const repository = new SqliteSettingsRepository(database.db)
      expect(repository.get()).toBeNull()

      seedSettings(repository, {
        providerUrl: 'https://isp.example.test',
        providerUsername: 'operator',
        providerPassword: 'repository-secret',
      })

      const seeded = repository.get()
      expect(seeded?.company.name).toBeNull()
      expect(seeded?.company.taxId).toBeNull()
      expect(seeded?.isp.password).toBe('repository-secret')

      repository.save(createSettings())
      const rehydrated = repository.get()
      expect(rehydrated?.isp.baseUrl).toBe('https://isp.example.test/api/v1')
      expect(rehydrated?.importPolicy.statuses).toEqual(['ACTIVO', 'CORTADO'])
      expect(rehydrated?.importPolicy.maxNewAmountMinorUnits).toBe(250000)
    } finally {
      database.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
