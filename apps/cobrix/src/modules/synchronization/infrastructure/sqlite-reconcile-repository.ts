import { eq } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  contracts,
  invoices,
  runItems,
  runs,
} from '../../../../drizzle/schema.drizzle.ts'
import type { RunItemDraft } from '../application/run-item-draft.ts'
import type { ReconcileRepository } from '../application/ports/reconcile-repository.ts'
import type {
  InvoiceToReconcile,
  ReconcileInvoiceChange,
} from '../application/reconcile-models.ts'

export class SqliteReconcileRepository implements ReconcileRepository {
  constructor(private readonly db: CobrixDatabase) {}

  startRun(simulation: boolean, startedAt: string): number {
    return this.db
      .insert(runs)
      .values({ kind: 'RECONCILE', simulation, status: 'RUNNING', startedAt })
      .returning({ id: runs.id })
      .get()!.id
  }

  listInvoices(): readonly InvoiceToReconcile[] {
    return this.db
      .select({
        id: invoices.id,
        customerId: contracts.customerId,
        externalContractId: invoices.externalContractId,
        externalInstallmentId: invoices.externalInstallmentId,
        period: invoices.period,
        total: invoices.total,
        balance: invoices.balance,
        status: invoices.status,
      })
      .from(invoices)
      .innerJoin(
        contracts,
        eq(contracts.externalId, invoices.externalContractId)
      )
      .all()
  }

  completeRun(input: {
    readonly runId: number
    readonly simulation: boolean
    readonly changes: readonly ReconcileInvoiceChange[]
    readonly items: readonly RunItemDraft[]
    readonly summary: Record<string, unknown>
    readonly finishedAt: string
  }): void {
    this.db.transaction((tx) => {
      if (!input.simulation) {
        for (const change of input.changes) {
          tx.update(invoices)
            .set({
              status: change.status,
              balance: change.balance,
              paidAt: change.paidAt,
              payerInvoiceId: change.payerInvoiceId,
              updatedAt: input.finishedAt,
            })
            .where(eq(invoices.id, change.invoiceId))
            .run()
        }
      }
      saveRunItems(tx, input.runId, input.items)
      tx.update(runs)
        .set({
          status: 'COMPLETED',
          summary: JSON.stringify(input.summary),
          finishedAt: input.finishedAt,
        })
        .where(eq(runs.id, input.runId))
        .run()
    })
  }

  failRun(input: {
    readonly runId: number
    readonly items: readonly RunItemDraft[]
    readonly error: string
    readonly summary: Record<string, unknown>
    readonly finishedAt: string
  }): void {
    this.db.transaction((tx) => {
      saveRunItems(tx, input.runId, input.items)
      tx.update(runs)
        .set({
          status: 'FAILED',
          error: input.error,
          summary: JSON.stringify(input.summary),
          finishedAt: input.finishedAt,
        })
        .where(eq(runs.id, input.runId))
        .run()
    })
  }
}

function saveRunItems(
  tx: Parameters<CobrixDatabase['transaction']>[0] extends (
    tx: infer T
  ) => unknown
    ? T
    : never,
  runId: number,
  items: readonly RunItemDraft[]
): void {
  if (!items.length) return
  tx.insert(runItems)
    .values(
      items.map((item) => ({
        runId,
        externalContractId: item.contractId,
        externalInstallmentId: item.installmentId,
        customerId: item.customerId,
        period: item.period,
        outcome: item.outcome,
        reason: item.reason,
        amount: item.amount,
        details: JSON.stringify(item.details ?? {}),
      }))
    )
    .run()
}
