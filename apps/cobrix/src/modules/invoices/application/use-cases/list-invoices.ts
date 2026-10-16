import type { InvoiceStatusFilter } from '../invoice-read-models.ts'
import type { InvoiceRepository } from '../ports/invoice-repository.ts'

export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  execute(status?: InvoiceStatusFilter) {
    return this.invoiceRepository.list(status)
  }
}
