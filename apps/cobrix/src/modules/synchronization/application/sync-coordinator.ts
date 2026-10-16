import type { ImportContractsUseCase } from './use-cases/import-contracts.ts'
import type { ReconcilePaymentsUseCase } from './use-cases/reconcile-payments.ts'
import { SyncConflictError } from './sync-conflict-error.ts'

export class SyncCoordinator {
  private busy = false

  constructor(
    private readonly importer: ImportContractsUseCase,
    private readonly reconciler: ReconcilePaymentsUseCase
  ) {}

  get running(): boolean {
    return this.busy
  }

  import(simulation: boolean): Promise<number> {
    return this.execute(() => this.importer.execute(simulation))
  }

  reconcile(simulation: boolean): Promise<number> {
    return this.execute(() => this.reconciler.execute(simulation))
  }

  async automatic(): Promise<void> {
    await this.execute(async () => {
      await this.importer.execute(false)
      await this.reconciler.execute(false)
      return 0
    })
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy)
      throw new SyncConflictError('Ya hay una sincronización en curso.')
    this.busy = true
    try {
      return await operation()
    } finally {
      this.busy = false
    }
  }
}
