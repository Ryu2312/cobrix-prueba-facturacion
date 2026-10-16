import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cron, { type ScheduledTask } from 'node-cron'

import type { SettingsRepository } from '../src/modules/settings/application/ports/settings-repository.ts'
import { SettingsFactory } from '../src/modules/settings/domain/settings-factory.ts'
import type { Settings } from '../src/modules/settings/domain/settings.ts'
import { SyncCoordinator } from '../src/modules/synchronization/application/sync-coordinator.ts'
import { DailyScheduler } from '../src/modules/synchronization/infrastructure/daily-scheduler.ts'
import type { ImportContractsUseCase } from '../src/modules/synchronization/application/use-cases/import-contracts.ts'
import type { ReconcilePaymentsUseCase } from '../src/modules/synchronization/application/use-cases/reconcile-payments.ts'
import { SyncConflictError } from '../src/modules/synchronization/application/sync-conflict-error.ts'

function buildSettings(schedule: { enabled: boolean; time: string }): Settings {
  return SettingsFactory.create({
    company: { name: 'Cobrix', taxId: 'J-123', collectionEmail: null },
    isp: {
      baseUrl: 'http://127.0.0.1:4310',
      username: 'cobrix',
      password: 'password',
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
    schedule,
  })
}

describe('DailyScheduler y corrida automática', () => {
  let mockTask: ScheduledTask
  let scheduleSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockTask = {
      stop: vi.fn(),
      start: vi.fn(),
      now: vi.fn(),
      destroy: vi.fn(),
      getStatus: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as ScheduledTask

    scheduleSpy = vi.spyOn(cron, 'schedule').mockReturnValue(mockTask)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('programa la tarea diaria con la expresión cron y zona horaria de Caracas', () => {
    const settings = buildSettings({ enabled: true, time: '04:15' })
    const repository: SettingsRepository = {
      get: () => settings,
      create: () => undefined,
      save: () => undefined,
    }
    const coordinator = new SyncCoordinator(
      {} as ImportContractsUseCase,
      {} as ReconcilePaymentsUseCase
    )

    const scheduler = new DailyScheduler(repository, coordinator)
    scheduler.configure()

    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(scheduleSpy).toHaveBeenCalledWith(
      '15 4 * * *',
      expect.any(Function),
      {
        timezone: 'America/Caracas',
        noOverlap: true,
        name: 'cobrix-daily-sync',
      }
    )

    scheduler.close()
    expect(mockTask.stop).toHaveBeenCalled()
  })

  it('no programa nada y detiene la tarea previa si scheduleEnabled es false', () => {
    let currentSettings = buildSettings({ enabled: true, time: '02:00' })
    const repository: SettingsRepository = {
      get: () => currentSettings,
      create: () => undefined,
      save: () => undefined,
    }
    const coordinator = new SyncCoordinator(
      {} as ImportContractsUseCase,
      {} as ReconcilePaymentsUseCase
    )

    const scheduler = new DailyScheduler(repository, coordinator)
    scheduler.configure()
    expect(scheduleSpy).toHaveBeenCalledTimes(1)

    // Ahora se desactiva
    currentSettings = buildSettings({ enabled: false, time: '02:00' })
    scheduler.configure()

    expect(mockTask.stop).toHaveBeenCalledTimes(1)
    expect(scheduleSpy).toHaveBeenCalledTimes(1) // No se volvió a llamar
  })

  it('ejecuta coordinator.automatic() cuando el cron dispara la tarea', async () => {
    let taskCallback: (() => Promise<void>) | null = null
    scheduleSpy.mockImplementation((_expr: string, callback: unknown) => {
      taskCallback = callback as () => Promise<void>
      return mockTask
    })

    const settings = buildSettings({ enabled: true, time: '03:30' })
    const repository: SettingsRepository = {
      get: () => settings,
      create: () => undefined,
      save: () => undefined,
    }

    const importer = {
      execute: vi.fn().mockResolvedValue(101),
    } as unknown as ImportContractsUseCase

    const reconciler = {
      execute: vi.fn().mockResolvedValue(102),
    } as unknown as ReconcilePaymentsUseCase

    const coordinator = new SyncCoordinator(importer, reconciler)
    const automaticSpy = vi.spyOn(coordinator, 'automatic')

    const scheduler = new DailyScheduler(repository, coordinator)
    scheduler.configure()

    expect(taskCallback).not.toBeNull()
    await taskCallback!()

    expect(automaticSpy).toHaveBeenCalledTimes(1)
    expect(importer.execute).toHaveBeenCalledWith(false)
    expect(reconciler.execute).toHaveBeenCalledWith(false)

    scheduler.close()
  })

  it('captura errores de forma segura en el callback del scheduler sin romper el proceso', async () => {
    let taskCallback: (() => Promise<void>) | null = null
    scheduleSpy.mockImplementation((_expr: string, callback: unknown) => {
      taskCallback = callback as () => Promise<void>
      return mockTask
    })

    const settings = buildSettings({ enabled: true, time: '03:30' })
    const repository: SettingsRepository = {
      get: () => settings,
      create: () => undefined,
      save: () => undefined,
    }

    const coordinator = {
      automatic: vi.fn().mockRejectedValue(new Error('Fallo de conexión ISP')),
    } as unknown as SyncCoordinator

    const scheduler = new DailyScheduler(repository, coordinator)
    scheduler.configure()

    await expect(taskCallback!()).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[scheduler] corrida automática fallida:',
      expect.stringContaining('Fallo de conexión ISP')
    )

    scheduler.close()
  })

  it('SyncCoordinator.automatic ejecuta importación y luego conciliación en orden', async () => {
    const executionOrder: string[] = []

    const importer = {
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('importer')
        return 1
      }),
    } as unknown as ImportContractsUseCase

    const reconciler = {
      execute: vi.fn().mockImplementation(async () => {
        executionOrder.push('reconciler')
        return 2
      }),
    } as unknown as ReconcilePaymentsUseCase

    const coordinator = new SyncCoordinator(importer, reconciler)
    await coordinator.automatic()

    expect(executionOrder).toEqual(['importer', 'reconciler'])
    expect(importer.execute).toHaveBeenCalledWith(false)
    expect(reconciler.execute).toHaveBeenCalledWith(false)
  })

  it('SyncCoordinator.automatic no ejecuta la conciliación si la importación falla', async () => {
    const importer = {
      execute: vi
        .fn()
        .mockRejectedValue(new Error('Error de proveedor en importación')),
    } as unknown as ImportContractsUseCase

    const reconciler = {
      execute: vi.fn(),
    } as unknown as ReconcilePaymentsUseCase

    const coordinator = new SyncCoordinator(importer, reconciler)

    await expect(coordinator.automatic()).rejects.toThrow(
      'Error de proveedor en importación'
    )
    expect(reconciler.execute).not.toHaveBeenCalled()
  })

  it('SyncCoordinator rechaza concurrencia durante una corrida automática', async () => {
    let finishImport: () => void = () => {}
    const importer = {
      execute: vi.fn().mockImplementation(
        () =>
          new Promise<number>((resolve) => {
            finishImport = () => resolve(1)
          })
      ),
    } as unknown as ImportContractsUseCase

    const reconciler = {
      execute: vi.fn().mockResolvedValue(2),
    } as unknown as ReconcilePaymentsUseCase

    const coordinator = new SyncCoordinator(importer, reconciler)
    const pendingAuto = coordinator.automatic()

    expect(coordinator.running).toBe(true)
    await expect(coordinator.import(true)).rejects.toThrow(SyncConflictError)
    await expect(coordinator.reconcile(false)).rejects.toThrow(
      'Ya hay una sincronización en curso.'
    )

    finishImport()
    await pendingAuto
    expect(coordinator.running).toBe(false)
  })

  it('valida que la hora no genere una expresión cron inválida ni permita ejecutar sin configuración', () => {
    const repositoryWithoutSettings: SettingsRepository = {
      get: () => null,
      create: () => undefined,
      save: () => undefined,
    }
    const coordinator = new SyncCoordinator(
      {} as ImportContractsUseCase,
      {} as ReconcilePaymentsUseCase
    )

    const scheduler1 = new DailyScheduler(
      repositoryWithoutSettings,
      coordinator
    )
    expect(() => scheduler1.configure()).toThrow(
      'La configuración no está inicializada.'
    )

    // Mock validate para simular expresión rechazada por node-cron
    const validateSpy = vi.spyOn(cron, 'validate').mockReturnValue(false)
    const settings = buildSettings({ enabled: true, time: '12:00' })
    const repositoryWithSettings: SettingsRepository = {
      get: () => settings,
      create: () => undefined,
      save: () => undefined,
    }
    const scheduler2 = new DailyScheduler(repositoryWithSettings, coordinator)
    expect(() => scheduler2.configure()).toThrow(
      'La hora configurada genera una expresión de cron inválida.'
    )
    validateSpy.mockRestore()
  })
})
