import { eq, sql } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
} from '../../../../drizzle/schema.drizzle.ts'
import type {
  InvoiceStatusFilter,
  InvoiceSummary,
} from '../application/invoice-read-models.ts'
import type { InvoiceRepository } from '../application/ports/invoice-repository.ts'

export class SqliteInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: CobrixDatabase) {}

  list(status?: InvoiceStatusFilter): readonly InvoiceSummary[] {
    return this.db
      .select({
        id: invoices.id,
        customerId: customers.id,
        customerName: customers.name,
        documentType: customers.documentType,
        externalContractId: contracts.externalId,
        contractCode: contracts.code,
        plan: contracts.plan,
        externalInstallmentId: invoices.externalInstallmentId,
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
      .where(status ? eq(invoices.status, status) : undefined)
      .orderBy(sql`${invoices.dueAt} desc`)
      .all()
  }
}
