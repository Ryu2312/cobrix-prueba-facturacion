export interface DashboardSummary {
  readonly totals: {
    readonly customers: number
    readonly contracts: number
    readonly openInvoices: number
    readonly paidInvoices: number
    readonly amountDue: number
    readonly currency: string
  }
  readonly provider: {
    readonly configured: boolean
  }
  readonly schedule: {
    readonly enabled: boolean
    readonly time: string
    readonly timeZone: string
  }
  readonly recentRuns: readonly DashboardRun[]
}

export interface DashboardRun {
  readonly id: number
  readonly kind: 'IMPORT' | 'RECONCILE'
  readonly simulation: boolean
  readonly status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  readonly summary: unknown
  readonly error: string | null
  readonly startedAt: string
  readonly finishedAt: string | null
}
