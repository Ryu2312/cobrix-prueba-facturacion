import { eq, inArray } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
  runItems,
  runs,
} from '../../../../drizzle/schema.drizzle.ts'
import { cutDate, periodDueDate } from '../domain/period.ts'
import type { RunItemDraft } from '../application/run-item-draft.ts'
import type {
  ImportInvoiceDraft,
  ImportRepository,
} from '../application/ports/import-repository.ts'

export class SqliteImportRepository implements ImportRepository {
  constructor(private readonly db: CobrixDatabase) {}

  startRun(simulation: boolean, startedAt: string): number {
    return this.db
      .insert(runs)
      .values({ kind: 'IMPORT', simulation, status: 'RUNNING', startedAt })
      .returning({ id: runs.id })
      .get()!.id
  }

  findExistingInstallments(contractIds: readonly number[]): readonly {
    readonly contractId: number
    readonly installmentId: string
  }[] {
    if (!contractIds.length) return []
    return this.db
      .select({
        contractId: invoices.externalContractId,
        installmentId: invoices.externalInstallmentId,
      })
      .from(invoices)
      .where(inArray(invoices.externalContractId, [...new Set(contractIds)]))
      .all()
  }

  completeRun(input: {
    runId: number
    simulation: boolean
    accepted: ImportInvoiceDraft[]
    graceDays: number
    items: RunItemDraft[]
    summary: Record<string, unknown>
    finishedAt: string
  }): void {
    this.db.transaction((tx) => {
      if (!input.simulation) {
        const now = input.finishedAt
        for (const row of input.accepted) {
          tx.insert(customers)
            .values({
              id: row.customerId,
              name: row.name.trim(),
              documentType: row.documentType,
              email: row.email,
              phone: row.phone,
              address: row.address,
              updatedAt: now,
              createdAt: now,
            })
            .onConflictDoUpdate({
              target: customers.id,
              set: {
                name: row.name.trim(),
                email: row.email,
                phone: row.phone,
                address: row.address,
                updatedAt: now,
              },
            })
            .run()
          tx.insert(contracts)
            .values({
              externalId: row.contractId,
              customerId: row.customerId,
              code: row.code,
              status: row.status,
              plan: row.plan,
              address: row.address,
              price: row.price,
              currency: row.currency,
              branch: row.branch,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: contracts.externalId,
              set: {
                customerId: row.customerId,
                code: row.code,
                status: row.status,
                plan: row.plan,
                address: row.address,
                price: row.price,
                currency: row.currency,
                branch: row.branch,
                updatedAt: now,
              },
            })
            .run()
          const dueAt = periodDueDate(row.period)
          tx.insert(invoices)
            .values({
              externalContractId: row.contractId,
              externalInstallmentId: row.installmentId,
              period: row.period,
              dueAt,
              cutAt: cutDate(dueAt, input.graceDays),
              currency: row.currency,
              total: roundMoney(row.debt),
              balance: roundMoney(row.debt),
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoNothing()
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
    runId: number
    items: RunItemDraft[]
    error: string
    summary: Record<string, unknown>
    finishedAt: string
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

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
