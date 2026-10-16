import type { CobrixDatabase } from '../modules/shared/infrastructure/database.ts'
import { GetCustomerUseCase } from '../modules/customers/application/use-cases/get-customer.ts'
import { ListCustomersUseCase } from '../modules/customers/application/use-cases/list-customers.ts'
import { SqliteCustomerRepository } from '../modules/customers/infrastructure/sqlite-customer-repository.ts'
import { GetDashboardSummaryUseCase } from '../modules/dashboard/application/use-cases/get-dashboard-summary.ts'
import { SqliteDashboardRepository } from '../modules/dashboard/infrastructure/sqlite-dashboard-repository.ts'
import { ListInvoicesUseCase } from '../modules/invoices/application/use-cases/list-invoices.ts'
import { SqliteInvoiceRepository } from '../modules/invoices/infrastructure/sqlite-invoice-repository.ts'
import type { SettingsRepository } from '../modules/settings/application/ports/settings-repository.ts'
import { GetSettingsUseCase } from '../modules/settings/application/use-cases/get-settings.ts'
import { TestIspConnectionUseCase } from '../modules/settings/application/use-cases/test-isp-connection.ts'
import { UpdateSettingsUseCase } from '../modules/settings/application/use-cases/update-settings.ts'
import { HttpIspConnection } from '../modules/settings/infrastructure/isp-connection.ts'
import { SqliteSettingsRepository } from '../modules/settings/infrastructure/sqlite-settings-repository.ts'
import { GetRunUseCase } from '../modules/synchronization/application/use-cases/get-run.ts'
import { ImportContractsUseCase } from '../modules/synchronization/application/use-cases/import-contracts.ts'
import { ListRunsUseCase } from '../modules/synchronization/application/use-cases/list-runs.ts'
import { ReconcilePaymentsUseCase } from '../modules/synchronization/application/use-cases/reconcile-payments.ts'
import { SyncCoordinator } from '../modules/synchronization/application/sync-coordinator.ts'
import { DailyScheduler } from '../modules/synchronization/infrastructure/daily-scheduler.ts'
import { HttpImportIspGatewayFactory } from '../modules/synchronization/infrastructure/isp-import-gateway.ts'
import { SqliteImportRepository } from '../modules/synchronization/infrastructure/sqlite-import-repository.ts'
import { SqliteReconcileRepository } from '../modules/synchronization/infrastructure/sqlite-reconcile-repository.ts'
import { SqliteRunHistoryRepository } from '../modules/synchronization/infrastructure/sqlite-run-history-repository.ts'

export interface CobrixServices {
  readonly settingsRepository: SettingsRepository
  readonly getSettings: GetSettingsUseCase
  readonly updateSettings: UpdateSettingsUseCase
  readonly testIspConnection: TestIspConnectionUseCase
  readonly getDashboardSummary: GetDashboardSummaryUseCase
  readonly listCustomers: ListCustomersUseCase
  readonly getCustomer: GetCustomerUseCase
  readonly listInvoices: ListInvoicesUseCase
  readonly listRuns: ListRunsUseCase
  readonly getRun: GetRunUseCase
  readonly coordinator: SyncCoordinator
  readonly scheduler: DailyScheduler
}

export function createServices(db: CobrixDatabase): CobrixServices {
  const settingsRepository = new SqliteSettingsRepository(db)
  const customerRepository = new SqliteCustomerRepository(db)
  const runHistoryRepository = new SqliteRunHistoryRepository(db)
  const ispGatewayFactory = new HttpImportIspGatewayFactory()

  const importer = new ImportContractsUseCase(
    settingsRepository,
    new SqliteImportRepository(db),
    ispGatewayFactory
  )
  const reconciler = new ReconcilePaymentsUseCase(
    settingsRepository,
    new SqliteReconcileRepository(db),
    ispGatewayFactory
  )
  const coordinator = new SyncCoordinator(importer, reconciler)
  const scheduler = new DailyScheduler(settingsRepository, coordinator)

  return {
    settingsRepository,
    getSettings: new GetSettingsUseCase(settingsRepository),
    updateSettings: new UpdateSettingsUseCase(settingsRepository),
    testIspConnection: new TestIspConnectionUseCase(
      settingsRepository,
      new HttpIspConnection()
    ),
    getDashboardSummary: new GetDashboardSummaryUseCase(
      new SqliteDashboardRepository(db)
    ),
    listCustomers: new ListCustomersUseCase(customerRepository),
    getCustomer: new GetCustomerUseCase(customerRepository),
    listInvoices: new ListInvoicesUseCase(new SqliteInvoiceRepository(db)),
    listRuns: new ListRunsUseCase(runHistoryRepository),
    getRun: new GetRunUseCase(runHistoryRepository),
    coordinator,
    scheduler,
  }
}
