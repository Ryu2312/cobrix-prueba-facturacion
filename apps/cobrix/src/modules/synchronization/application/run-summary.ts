export interface RunSummary {
  readonly id: number
  readonly kind: 'IMPORT' | 'RECONCILE'
  readonly simulation: boolean
  readonly status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  readonly summary: unknown
  readonly error: string | null
  readonly startedAt: string
  readonly finishedAt: string | null
}

export interface RunDetails extends RunSummary {
  readonly items: readonly RunItem[]
}

export interface RunItem {
  readonly id: number
  readonly runId: number
  readonly externalContractId: number | null
  readonly externalInstallmentId: string | null
  readonly customerId: string | null
  readonly period: string | null
  readonly outcome: string
  readonly reason: string
  readonly amount: number | null
  readonly details: unknown
}
