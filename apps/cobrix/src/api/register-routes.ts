import type { FastifyInstance } from 'fastify'

import type { CobrixServices } from '../bootstrap/create-services.ts'
import { CustomersRoutes } from '../modules/customers/presentation/customers.routes.ts'
import { DashboardRoutes } from '../modules/dashboard/presentation/dashboard.routes.ts'
import { InvoicesRoutes } from '../modules/invoices/presentation/invoices.routes.ts'
import { SettingsRoutes } from '../modules/settings/presentation/settings.routes.ts'
import { RunsRoutes } from '../modules/synchronization/presentation/runs.routes.ts'
import { SynchronizationRoutes } from '../modules/synchronization/presentation/synchronization.routes.ts'

export function registerRoutes(
  app: FastifyInstance,
  services: CobrixServices
): void {
  app.get('/api/health', async () => ({ ok: true, service: 'cobrix' }))

  new DashboardRoutes(services.getDashboardSummary).register(app)
  new CustomersRoutes(services.listCustomers, services.getCustomer).register(
    app
  )
  new InvoicesRoutes(services.listInvoices).register(app)
  new RunsRoutes(services.listRuns, services.getRun).register(app)
  new SettingsRoutes(
    services.getSettings,
    services.updateSettings,
    services.testIspConnection,
    () => services.scheduler.configure()
  ).register(app)
  new SynchronizationRoutes(services.coordinator, services.getRun).register(app)
}
