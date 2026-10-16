import type { InvoiceSummary } from '../application/invoice-read-models.ts'

export interface InvoiceSummaryResponseDto {
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

export function toInvoiceSummaryResponseDto(
  invoice: InvoiceSummary
): InvoiceSummaryResponseDto {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    documentType: invoice.documentType,
    externalContractId: invoice.externalContractId,
    contractCode: invoice.contractCode,
    plan: invoice.plan,
    externalInstallmentId: invoice.externalInstallmentId,
    period: invoice.period,
    dueAt: invoice.dueAt,
    cutAt: invoice.cutAt,
    currency: invoice.currency,
    total: invoice.total,
    balance: invoice.balance,
    status: invoice.status,
    paidAt: invoice.paidAt,
    payerInvoiceId: invoice.payerInvoiceId,
  }
}
