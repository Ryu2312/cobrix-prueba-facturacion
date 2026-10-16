import type {
  InvoiceStatusFilter,
  InvoiceSummary,
} from '../invoice-read-models.ts'

export interface InvoiceRepository {
  list(status?: InvoiceStatusFilter): readonly InvoiceSummary[]
}
