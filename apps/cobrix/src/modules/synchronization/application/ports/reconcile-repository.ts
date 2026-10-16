import type { RunItemDraft } from '../run-item-draft.ts'
import type {
  InvoiceToReconcile,
  ReconcileInvoiceChange,
} from '../reconcile-models.ts'

export interface ReconcileRepository {
  startRun(simulation: boolean, startedAt: string): number
  listInvoices(): readonly InvoiceToReconcile[]
  completeRun(input: {
    readonly runId: number
    readonly simulation: boolean
    readonly changes: readonly ReconcileInvoiceChange[]
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
