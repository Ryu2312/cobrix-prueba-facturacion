import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const company = sqliteTable(
  'company',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    taxId: text('tax_id').notNull(),
    collectionEmail: text('collection_email'),
  },
  (table) => [check('company_singleton_id_check', sql`${table.id} = 1`)]
)

export const provider = sqliteTable(
  'provider',
  {
    id: integer('id').primaryKey(),
    baseUrl: text('base_url').notNull(),
    username: text('username').notNull(),
    password: text('password').notNull(),
  },
  (table) => [check('provider_singleton_id_check', sql`${table.id} = 1`)]
)

export const syncSettings = sqliteTable(
  'sync_settings',
  {
    id: integer('id').primaryKey(),
    statuses: text('statuses').notNull(),
    importWindowMonths: integer('import_window_months'),
    maxInstallmentsPerContract: integer('max_installments_per_contract'),
    graceDays: integer('grace_days').notNull(),
    maxNewInvoices: integer('max_new_invoices'),
    maxNewAmount: real('max_new_amount'),
    excludedDocumentTypes: text('excluded_document_types').notNull(),
    scheduleEnabled: integer('schedule_enabled', {
      mode: 'boolean',
    }).notNull(),
    scheduleTime: text('schedule_time').notNull(),
  },
  (table) => [check('sync_settings_singleton_id_check', sql`${table.id} = 1`)]
)

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    documentType: text('document_type').notNull(),
    email: text('email').notNull().default(''),
    phone: text('phone').notNull().default(''),
    address: text('address').notNull().default(''),
    origin: text('origin').notNull().default('ISP'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('customers_name_idx').on(table.name)]
)

export const contracts = sqliteTable(
  'contracts',
  {
    externalId: integer('external_id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    status: text('status').notNull(),
    plan: text('plan').notNull(),
    address: text('address').notNull().default(''),
    price: real('price').notNull(),
    currency: text('currency').notNull(),
    branch: text('branch').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('contracts_customer_idx').on(table.customerId),
    index('contracts_status_idx').on(table.status),
  ]
)

export const invoices = sqliteTable(
  'invoices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    externalContractId: integer('external_contract_id')
      .notNull()
      .references(() => contracts.externalId, { onDelete: 'restrict' }),
    externalInstallmentId: text('external_installment_id').notNull(),
    period: text('period').notNull(),
    dueAt: text('due_at').notNull(),
    cutAt: text('cut_at').notNull(),
    currency: text('currency').notNull(),
    total: real('total').notNull(),
    balance: real('balance').notNull(),
    status: text('status', { enum: ['OPEN', 'PAID'] })
      .notNull()
      .default('OPEN'),
    paidAt: text('paid_at'),
    payerInvoiceId: text('payer_invoice_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('invoices_external_installment_unique').on(
      table.externalContractId,
      table.externalInstallmentId
    ),
    index('invoices_status_due_idx').on(table.status, table.dueAt),
    index('invoices_contract_idx').on(table.externalContractId),
  ]
)

export const runs = sqliteTable(
  'runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind', { enum: ['IMPORT', 'RECONCILE'] }).notNull(),
    simulation: integer('simulation', { mode: 'boolean' }).notNull(),
    status: text('status', { enum: ['RUNNING', 'COMPLETED', 'FAILED'] })
      .notNull()
      .default('RUNNING'),
    summary: text('summary').notNull().default(''),
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (table) => [index('runs_started_idx').on(table.startedAt)]
)

export const runItems = sqliteTable(
  'run_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: integer('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    externalContractId: integer('external_contract_id'),
    externalInstallmentId: text('external_installment_id'),
    customerId: text('customer_id'),
    period: text('period'),
    outcome: text('outcome').notNull(),
    reason: text('reason').notNull(),
    amount: real('amount'),
    details: text('details').notNull().default('{}'),
  },
  (table) => [
    index('run_items_run_idx').on(table.runId),
    index('run_items_installment_idx').on(
      table.externalContractId,
      table.externalInstallmentId
    ),
  ]
)
