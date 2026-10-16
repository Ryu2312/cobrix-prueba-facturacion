export interface RunItemDraft {
  readonly contractId: number | null
  readonly installmentId: string | null
  readonly customerId: string | null
  readonly period: string | null
  readonly outcome: string
  readonly reason: string
  readonly amount: number | null
  readonly details?: Record<string, unknown>
}
