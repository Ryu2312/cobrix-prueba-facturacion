import type { DashboardRepository } from '../ports/dashboard-repository.ts'

export class GetDashboardSummaryUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  execute() {
    const summary = this.dashboardRepository.getSummary()

    return {
      totals: {
        customers: summary.totals.customers,
        contracts: summary.totals.contracts,
        openInvoices: summary.totals.openInvoices,
        paidInvoices: summary.totals.paidInvoices,
        amountDue: summary.totals.amountDue,
        currency: summary.totals.currency,
      },
      provider: {
        configured: summary.provider.configured,
      },
      schedule: {
        enabled: summary.schedule.enabled,
        time: summary.schedule.time,
        timeZone: summary.schedule.timeZone,
      },
      recentRuns: summary.recentRuns.map((run) => ({ ...run })),
    }
  }
}
