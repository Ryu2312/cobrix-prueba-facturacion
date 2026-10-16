export interface InvoiceSummary {
  readonly id: number
  readonly customerId: string
  readonly customerName: string
  readonly documentType: string
  readonly externalContractId: number
  readonly contractCode: string
  readonly plan: string
  readonly externalInstallmentId: string
  readonly period: string
  readonly dueAt: string
  readonly cutAt: string
  readonly currency: string
  readonly total: number
  readonly balance: number
  readonly status: 'OPEN' | 'PAID'
  readonly paidAt: string | null
  readonly payerInvoiceId: string | null
}

export type InvoiceStatusFilter = 'OPEN' | 'PAID'
