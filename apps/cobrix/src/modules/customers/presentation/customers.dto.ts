import type {
  CustomerDetails,
  CustomerSummary,
} from '../application/customer-read-models.ts'

export interface CustomerSummaryResponseDto {
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

export interface CustomerDetailsResponseDto {
  readonly id: string
  readonly name: string
  readonly documentType: string
  readonly email: string
  readonly phone: string
  readonly address: string
  readonly origin: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly contracts: CustomerDetails['contracts']
  readonly invoices: CustomerDetails['invoices']
  readonly history: CustomerDetails['history']
}

export function toCustomerSummaryResponseDto(
  customer: CustomerSummary
): CustomerSummaryResponseDto {
  return {
    id: customer.id,
    name: customer.name,
    documentType: customer.documentType,
    email: customer.email,
    phone: customer.phone,
    contracts: customer.contracts,
    openInvoices: customer.openInvoices,
    paidInvoices: customer.paidInvoices,
    amountDue: customer.amountDue,
    oldestDueAt: customer.oldestDueAt,
  }
}

export function toCustomerDetailsResponseDto(
  customer: CustomerDetails
): CustomerDetailsResponseDto {
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
    contracts: customer.contracts.map((contract) => ({ ...contract })),
    invoices: customer.invoices.map((invoice) => ({ ...invoice })),
    history: customer.history.map((event) => ({
      ...event,
      payerInvoiceIds: [...event.payerInvoiceIds],
    })),
  }
}
