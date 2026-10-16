import { and, countDistinct, eq, isNull, like, min, or, sql } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
  runItems,
  runs,
} from '../../../../drizzle/schema.drizzle.ts'
import type {
  CustomerContract,
  CustomerDetails,
  CustomerHistoryEvent,
  CustomerInvoice,
  CustomerSummary,
} from '../application/customer-read-models.ts'
import type { CustomerRepository } from '../application/ports/customer-repository.ts'

export class SqliteCustomerRepository implements CustomerRepository {
  constructor(private readonly db: CobrixDatabase) {}

  list(query: string): readonly CustomerSummary[] {
    const trimmedQuery = query.trim()
    const needle = `%${escapeLike(trimmedQuery)}%`
    const rows = this.db
      .select({
        id: customers.id,
        name: customers.name,
        documentType: customers.documentType,
        email: customers.email,
        phone: customers.phone,
        contracts: countDistinct(contracts.externalId),
        openInvoices: sql<number>`sum(case when ${invoices.status} = 'OPEN' then 1 else 0 end)`,
        paidInvoices: sql<number>`sum(case when ${invoices.status} = 'PAID' then 1 else 0 end)`,
        amountDue: sql<number>`sum(case when ${invoices.status} = 'OPEN' then ${invoices.balance} else 0 end)`,
        oldestDueAt: min(
          sql<string>`case when ${invoices.status} = 'OPEN' then ${invoices.dueAt} else null end`
        ),
      })
      .from(customers)
      .leftJoin(contracts, eq(contracts.customerId, customers.id))
      .leftJoin(invoices, eq(invoices.externalContractId, contracts.externalId))
      .where(
        trimmedQuery
          ? or(like(customers.id, needle), like(customers.name, needle))
          : undefined
      )
      .groupBy(customers.id)
      .orderBy(customers.name)
      .all()

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      documentType: row.documentType,
      email: row.email,
      phone: row.phone,
      contracts: Number(row.contracts),
      openInvoices: Number(row.openInvoices ?? 0),
      paidInvoices: Number(row.paidInvoices ?? 0),
      amountDue: Number(row.amountDue ?? 0),
      oldestDueAt: row.oldestDueAt,
    }))
  }

  getById(id: string): CustomerDetails | null {
    const customer = this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .get()
    if (!customer) return null

    const customerContracts = this.db
      .select()
      .from(contracts)
      .where(eq(contracts.customerId, id))
      .orderBy(contracts.externalId)
      .all()
      .map(toCustomerContract)

    const customerInvoices: CustomerInvoice[] = this.db
      .select({
        id: invoices.id,
        customerId: customers.id,
        customerName: customers.name,
        documentType: customers.documentType,
        externalInstallmentId: invoices.externalInstallmentId,
        externalContractId: invoices.externalContractId,
        contractCode: contracts.code,
        plan: contracts.plan,
        period: invoices.period,
        dueAt: invoices.dueAt,
        cutAt: invoices.cutAt,
        currency: invoices.currency,
        total: invoices.total,
        balance: invoices.balance,
        status: invoices.status,
        paidAt: invoices.paidAt,
        payerInvoiceId: invoices.payerInvoiceId,
      })
      .from(invoices)
      .innerJoin(
        contracts,
        eq(contracts.externalId, invoices.externalContractId)
      )
      .innerJoin(customers, eq(customers.id, contracts.customerId))
      .where(eq(contracts.customerId, id))
      .orderBy(sql`${invoices.period} desc`)
      .all()

    const customerHistoryRows = this.db
      .select({
        id: runItems.id,
        runId: runs.id,
        startedAt: runs.startedAt,
        finishedAt: runs.finishedAt,
        outcome: runItems.outcome,
        externalContractId: runItems.externalContractId,
        externalInstallmentId: runItems.externalInstallmentId,
        period: runItems.period,
        plan: contracts.plan,
        details: runItems.details,
        invoiceId: invoices.id,
      })
      .from(runItems)
      .innerJoin(runs, eq(runs.id, runItems.runId))
      .leftJoin(
        contracts,
        eq(contracts.externalId, runItems.externalContractId)
      )
      .leftJoin(
        invoices,
        and(
          eq(invoices.externalContractId, runItems.externalContractId),
          eq(invoices.externalInstallmentId, runItems.externalInstallmentId)
        )
      )
      .where(
        and(
          eq(runs.simulation, false),
          eq(runs.status, 'COMPLETED'),
          or(
            eq(runItems.customerId, id),
            and(isNull(runItems.customerId), eq(contracts.customerId, id))
          ),
          or(
            eq(runItems.outcome, 'imported'),
            eq(runItems.outcome, 'marked_paid')
          )
        )
      )
      .orderBy(sql`${runs.startedAt} asc`, runItems.id)
      .all()

    const history = toCustomerHistory(
      customer,
      customerContracts,
      customerHistoryRows
    )

    return {
      id: customer.id,
      name: customer.name,
      documentType: customer.documentType,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      origin: customer.origin,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      contracts: customerContracts,
      invoices: customerInvoices,
      history,
    }
  }
}

function toCustomerContract(
  contract: typeof contracts.$inferSelect
): CustomerContract {
  return {
    externalId: contract.externalId,
    customerId: contract.customerId,
    code: contract.code,
    status: contract.status,
    plan: contract.plan,
    address: contract.address,
    price: contract.price,
    currency: contract.currency,
    branch: contract.branch,
    updatedAt: contract.updatedAt,
  }
}

function toCustomerHistory(
  customer: typeof customers.$inferSelect,
  contractsForCustomer: readonly CustomerContract[],
  historyRows: readonly {
    id: number
    runId: number
    startedAt: string
    finishedAt: string | null
    outcome: string
    externalContractId: number | null
    externalInstallmentId: string | null
    period: string | null
    plan: string | null
    details: string
    invoiceId: number | null
  }[]
): CustomerHistoryEvent[] {
  return [
    {
      id: `customer-${customer.id}`,
      type: 'CUSTOMER_CREATED',
      occurredAt: customer.createdAt,
      runId: null,
      invoiceId: null,
      externalContractId:
        historyRows.find((event) => event.outcome === 'imported')
          ?.externalContractId ??
        contractsForCustomer[0]?.externalId ??
        null,
      externalInstallmentId: null,
      period: null,
      plan: null,
      payerInvoiceIds: [],
    },
    ...historyRows.map((event) => ({
      id: `run-item-${event.id}`,
      type:
        event.outcome === 'imported'
          ? ('INVOICE_IMPORTED' as const)
          : ('INVOICE_PAID' as const),
      occurredAt: event.finishedAt ?? event.startedAt,
      runId: event.runId,
      invoiceId: event.invoiceId,
      externalContractId: event.externalContractId,
      externalInstallmentId: event.externalInstallmentId,
      period: event.period,
      plan: event.plan,
      payerInvoiceIds: parsePayerInvoiceIds(event.details),
    })),
  ]
}

function parsePayerInvoiceIds(value: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    return []
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.payerInvoiceIds)) return []
  return parsed.payerInvoiceIds.filter(
    (invoiceId): invoiceId is string => typeof invoiceId === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function escapeLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}
