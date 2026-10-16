import type { FastifyInstance } from 'fastify'

import type { InvoiceStatusFilter } from '../application/invoice-read-models.ts'
import type { ListInvoicesUseCase } from '../application/use-cases/list-invoices.ts'
import { toInvoiceSummaryResponseDto } from './invoices.dto.ts'
import { invoiceSearchQuerySchema } from './invoices.schema.ts'

export class InvoicesRoutes {
  constructor(private readonly listInvoices: ListInvoicesUseCase) {}

  register(app: FastifyInstance): void {
    app.get<{ Querystring: { readonly status?: InvoiceStatusFilter } }>(
      '/api/invoices',
      { schema: { querystring: invoiceSearchQuerySchema } },
      async (request) =>
        this.listInvoices
          .execute(request.query.status)
          .map(toInvoiceSummaryResponseDto)
    )
  }
}
