import { countDistinct, eq, sql } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
  provider,
  runs,
  syncSettings,
} from '../../../../drizzle/schema.drizzle.ts'
import type { DashboardRepository } from '../application/ports/dashboard-repository.ts'
import type {
  DashboardRun,
  DashboardSummary,
} from '../application/dashboard-summary.ts'

export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly db: CobrixDatabase) {}

  getSummary(): DashboardSummary {
    const totals = this.db
      .select({
        customers: countDistinct(customers.id),
        contracts: countDistinct(contracts.externalId),
        openInvoices: sql<number>`sum(case when ${invoices.status} = 'OPEN' then 1 else 0 end)`,
        paidInvoices: sql<number>`sum(case when ${invoices.status} = 'PAID' then 1 else 0 end)`,
        amountDue: sql<number>`sum(case when ${invoices.status} = 'OPEN' then ${invoices.balance} else 0 end)`,
      })
      .from(customers)
      .leftJoin(contracts, eq(contracts.customerId, customers.id))
      .leftJoin(invoices, eq(invoices.externalContractId, contracts.externalId))
      .get()

    const providerSettings = this.db
      .select({
        baseUrl: provider.baseUrl,
        username: provider.username,
        password: provider.password,
      })
      .from(provider)
      .where(eq(provider.id, 1))
      .get()
    const scheduleSettings = this.db
      .select({
        enabled: syncSettings.scheduleEnabled,
        time: syncSettings.scheduleTime,
      })
      .from(syncSettings)
      .where(eq(syncSettings.id, 1))
      .get()

    if (!providerSettings || !scheduleSettings) {
      throw new Error('La configuración del dashboard no está inicializada.')
    }

    const recentRuns = this.db
      .select()
      .from(runs)
      .orderBy(sql`${runs.startedAt} desc`)
      .limit(5)
      .all()

    return {
      totals: {
        customers: Number(totals?.customers ?? 0),
        contracts: Number(totals?.contracts ?? 0),
        openInvoices: Number(totals?.openInvoices ?? 0),
        paidInvoices: Number(totals?.paidInvoices ?? 0),
        amountDue: Number(totals?.amountDue ?? 0),
        currency: 'USD',
      },
      provider: {
        configured: Boolean(
          providerSettings.baseUrl &&
          providerSettings.username &&
          providerSettings.password
        ),
      },
      schedule: {
        enabled: scheduleSettings.enabled,
        time: scheduleSettings.time,
        timeZone: 'America/Caracas',
      },
      recentRuns: recentRuns.map(toDashboardRun),
    }
  }
}

function toDashboardRun(run: typeof runs.$inferSelect): DashboardRun {
  return {
    ...run,
    summary: parseJson(run.summary),
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return { invalidStoredJson: true }
  }
}
