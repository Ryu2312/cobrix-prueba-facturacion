export type JsonObject = Record<string, unknown>

export type Customer = {
  id: string
  name: string
  documentType: string
  email: string
  phone: string
  contracts: number
  openInvoices: number
  paidInvoices: number
  amountDue: number
  oldestDueAt: string | null
}

export type Contract = {
  externalId: number
  customerId: string
  code: string
  status: string
  plan: string
  address: string
  price: number
  currency: string
  branch: string
  updatedAt: string
}

export type Invoice = {
  id: number
  customerId: string
  customerName: string
  documentType: string
  externalContractId: number
  contractCode: string
  plan: string
  externalInstallmentId: string
  period: string
  dueAt: string
  cutAt: string
  currency: string
  total: number
  balance: number
  status: 'OPEN' | 'PAID'
  paidAt: string | null
  payerInvoiceId: string | null
}

export type CustomerHistoryEvent = {
  id: string
  type: 'CUSTOMER_CREATED' | 'INVOICE_IMPORTED' | 'INVOICE_PAID'
  occurredAt: string
  runId: number | null
  invoiceId: number | null
  externalContractId: number | null
  externalInstallmentId: string | null
  period: string | null
  plan: string | null
  payerInvoiceIds: string[]
}

export type CustomerDetail = {
  id: string
  name: string
  documentType: string
  email: string
  phone: string
  address: string
  origin: string
  createdAt: string
  updatedAt: string
  contracts: Contract[]
  invoices: Invoice[]
  history: CustomerHistoryEvent[]
}

export type Run = {
  id: number
  kind: 'IMPORT' | 'RECONCILE'
  simulation: boolean
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  summary: JsonObject
  error: string | null
  startedAt: string
  finishedAt: string | null
  items?: Array<{
    id: number
    externalContractId: number | null
    externalInstallmentId: string | null
    period: string | null
    outcome: string
    reason: string
    amount: number | null
  }>
}

export type DashboardSummary = {
  totals: {
    customers: number
    contracts: number
    openInvoices: number
    paidInvoices: number
    amountDue: number
    currency: string
  }
  provider: { configured: boolean }
  schedule: { enabled: boolean; time: string; timeZone: string }
  recentRuns: Run[]
}

export type Settings = {
  company: { name: string; taxId: string; collectionEmail: string }
  provider: { baseUrl: string; username: string; passwordSet: boolean }
  sync: {
    statuses: string[]
    importWindowMonths: number | null
    maxInstallmentsPerContract: number | null
    graceDays: number
    maxNewInvoices: number | null
    maxNewAmount: number | null
    excludedDocumentTypes: string[]
    scheduleEnabled: boolean
    scheduleTime: string
  }
}
