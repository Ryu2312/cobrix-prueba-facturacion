import type { RunItemDraft } from '../run-item-draft.ts'

export interface ImportInvoiceDraft {
  readonly contractId: number
  readonly customerId: string
  readonly documentType: 'juridical' | 'natural'
  readonly code: string
  readonly status: string
  readonly name: string
  readonly email: string
  readonly phone: string
  readonly address: string
  readonly plan: string
  readonly price: number
  readonly currency: string
  readonly branch: string
  readonly installmentId: string
  readonly debt: number
  readonly period: string
}

export interface ImportRepository {
  startRun(simulation: boolean, startedAt: string): number
  findExistingInstallments(
    contractIds: readonly number[]
  ): readonly { readonly contractId: number; readonly installmentId: string }[]
  completeRun(input: {
    readonly runId: number
    readonly simulation: boolean
    readonly accepted: readonly ImportInvoiceDraft[]
    readonly graceDays: number
    readonly items: readonly RunItemDraft[]
    readonly summary: Record<string, unknown>
    readonly finishedAt: string
  }): void
  failRun(input: {
    readonly runId: number
    readonly items: readonly RunItemDraft[]
    readonly error: string
    readonly summary: Record<string, unknown>
    readonly finishedAt: string
  }): void
}
