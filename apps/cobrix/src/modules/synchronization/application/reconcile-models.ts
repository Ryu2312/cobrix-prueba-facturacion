export interface InvoiceToReconcile {
  readonly id: number
  readonly customerId: string
  readonly externalContractId: number
  readonly externalInstallmentId: string
  readonly period: string
  readonly total: number
  readonly balance: number
  readonly status: 'OPEN' | 'PAID'
}

export interface ReconcileInvoiceChange {
  readonly invoiceId: number
  readonly status: 'OPEN' | 'PAID'
  readonly balance: number
  readonly paidAt: string | null
  readonly payerInvoiceId: string | null
}
