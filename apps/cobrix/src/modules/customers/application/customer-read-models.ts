export interface CustomerSummary {
  readonly id: string
  readonly name: string
  readonly documentType: string
  readonly email: string
  readonly phone: string
  readonly contracts: number
  readonly openInvoices: number
  readonly paidInvoices: number
  readonly amountDue: number
  readonly oldestDueAt: string | null
}

export interface CustomerContract {
  readonly externalId: number
  readonly customerId: string
  readonly code: string
  readonly status: string
  readonly plan: string
  readonly address: string
  readonly price: number
  readonly currency: string
  readonly branch: string
  readonly updatedAt: string
}

export interface CustomerInvoice {
  readonly id: number
  readonly customerId: string
  readonly customerName: string
  readonly documentType: string
  readonly externalInstallmentId: string
  readonly externalContractId: number
  readonly contractCode: string
  readonly plan: string
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

export interface CustomerHistoryEvent {
  readonly id: string
  readonly type: 'CUSTOMER_CREATED' | 'INVOICE_IMPORTED' | 'INVOICE_PAID'
  readonly occurredAt: string
  readonly runId: number | null
  readonly invoiceId: number | null
  readonly externalContractId: number | null
  readonly externalInstallmentId: string | null
  readonly period: string | null
  readonly plan: string | null
  readonly payerInvoiceIds: readonly string[]
}

export interface CustomerDetails {
  readonly id: string
  readonly name: string
  readonly documentType: string
  readonly email: string
  readonly phone: string
  readonly address: string
  readonly origin: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly contracts: readonly CustomerContract[]
  readonly invoices: readonly CustomerInvoice[]
  readonly history: readonly CustomerHistoryEvent[]
}
