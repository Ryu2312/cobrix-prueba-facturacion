import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createBillingApiServer } from '../../billing-api/src/server.ts'
import { seedBillingApi } from '../../billing-api/src/seed.ts'
import { openDatabase } from '../src/modules/shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
  runItems,
  runs,
} from '../drizzle/schema.drizzle.ts'
import { createServices } from '../src/bootstrap/create-services.ts'
import { SqliteCustomerRepository } from '../src/modules/customers/infrastructure/sqlite-customer-repository.ts'
import { SqliteSettingsRepository } from '../src/modules/settings/infrastructure/sqlite-settings-repository.ts'
import { seedSettings } from '../src/modules/settings/infrastructure/settings-seed.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

describe('ciclo de aceptación Cobrix', () => {
  let directory: string
  let api: ReturnType<typeof createBillingApiServer>
  let apiUrl: string
  let database: ReturnType<typeof openDatabase>
  let services: ReturnType<typeof createServices>

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'cobrix-acceptance-'))
    const billingDatabasePath = join(directory, 'billing.sqlite')
    seedBillingApi(billingDatabasePath)
    api = createBillingApiServer(billingDatabasePath)
    apiUrl = `http://127.0.0.1:${await api.listen(0)}`

    database = openDatabase({
      path: join(directory, 'cobrix.sqlite'),
      migrationsFolder: join(process.cwd(), 'drizzle', 'migrations'),
    })
    seedSettings(new SqliteSettingsRepository(database.db), {
      providerUrl: apiUrl,
      providerUsername: 'cobrix',
      providerPassword: 'cobrix-sandbox',
    })
    services = createServices(database.db)
  })

  afterAll(async () => {
    if (services) services.scheduler.close()
    if (database) database.close()
    if (api) await api.close()
    if (directory) rmSync(directory, { recursive: true, force: true })
  })

  it('simula sin escrituras, importa de forma idempotente y concilia pagos/anulación', async () => {
    const simulatedImportId = await services.coordinator.import(true)
    const simulation = database.db
      .select()
      .from(runs)
      .all()
      .find((run) => run.id === simulatedImportId)!
    expect(simulation.status).toBe('COMPLETED')
    expect(database.db.select().from(customers).all()).toHaveLength(0)
    expect(database.db.select().from(invoices).all()).toHaveLength(0)
    expect(JSON.parse(simulation.summary).newInvoices).toBe(42)

    await services.coordinator.import(false)
    expect(database.db.select().from(customers).all()).toHaveLength(20)
    expect(database.db.select().from(invoices).all()).toHaveLength(42)
    expect(sumOpenBalance(database.db.select().from(invoices).all())).toBe(1235)

    const secondImportId = await services.coordinator.import(false)
    const secondImport = database.db
      .select()
      .from(runs)
      .all()
      .find((run) => run.id === secondImportId)!
    expect(JSON.parse(secondImport.summary).newInvoices).toBe(0)
    expect(database.db.select().from(invoices).all()).toHaveLength(42)

    const luis = database.db
      .select()
      .from(customers)
      .all()
      .find((customer) => customer.name === 'LUIS GOMEZ')
    expect(luis?.id).toBe('V9876543')
    expect(
      database.db
        .select()
        .from(contracts)
        .all()
        .filter((contract) => contract.customerId === luis?.id)
    ).toHaveLength(2)
    expect(
      database.db
        .select()
        .from(customers)
        .all()
        .some((customer) => customer.id === '9000123')
    ).toBe(true)

    await simulatePayment({ id_contrato: 900101 })
    await simulatePayment({ id_contrato: 900103, monto: 25 })
    await simulatePayment({ id_contrato: 900104 })
    await simulatePayment({ id_contrato: 900114, monto: 70 })
    const elenaPayment = await simulatePayment({ id_contrato: 900113 })

    const simulatedReconcileId = await services.coordinator.reconcile(true)
    const simulatedReconcile = database.db
      .select()
      .from(runs)
      .all()
      .find((run) => run.id === simulatedReconcileId)!
    expect(simulatedReconcile.status).toBe('COMPLETED')
    expect(
      database.db
        .select()
        .from(invoices)
        .all()
        .every((invoice) => invoice.status === 'OPEN')
    ).toBe(true)
    expect(
      JSON.parse(simulatedReconcile.summary).items.marked_paid
    ).toBeGreaterThan(0)

    await services.coordinator.reconcile(false)
    const afterPayments = database.db.select().from(invoices).all()
    expect(
      afterPayments.filter((invoice) => invoice.status === 'PAID')
    ).toHaveLength(10)

    await simulateRequest('/__sim/anular', {
      id_factura: elenaPayment.id_factura,
    })

    await services.coordinator.reconcile(false)
    const allInvoices = database.db.select().from(invoices).all()
    expect(
      allInvoices.filter((invoice) => invoice.status === 'PAID')
    ).toHaveLength(8)
    expect(
      allInvoices.filter((invoice) => invoice.status === 'OPEN')
    ).toHaveLength(34)
    expect(sumOpenBalance(allInvoices)).toBe(955)

    await services.coordinator.reconcile(false)
    const repeated = database.db.select().from(invoices).all()
    expect(
      repeated.filter((invoice) => invoice.status === 'PAID')
    ).toHaveLength(8)
    expect(
      repeated.filter((invoice) => invoice.status === 'OPEN')
    ).toHaveLength(34)
    expect(sumOpenBalance(repeated)).toBe(955)

    const luisInstallments = repeated.filter(
      (invoice) => invoice.externalContractId === 900103
    )
    expect(
      luisInstallments.filter((invoice) => invoice.status === 'PAID')
    ).toHaveLength(1)
    expect(
      database.db
        .select()
        .from(runItems)
        .all()
        .some(
          (item) =>
            item.externalContractId === 900103 &&
            item.outcome === 'partial_payment'
        )
    ).toBe(true)

    const elenaInvoice = repeated.find(
      (invoice) => invoice.externalContractId === 900113
    )
    expect(elenaInvoice?.status).toBe('OPEN')
    expect(elenaInvoice?.balance).toBe(elenaInvoice?.total)

    const ana = database.db
      .select()
      .from(customers)
      .all()
      .find((customer) => customer.name === 'ANA PEREZ')
    expect(ana).toBeDefined()
    const anaDetails = new SqliteCustomerRepository(database.db).getById(
      ana!.id
    )
    expect(anaDetails?.history[0]?.type).toBe('CUSTOMER_CREATED')
    expect(anaDetails?.history[0]?.externalContractId).toBe(900101)
    expect(anaDetails?.contracts[0]?.address).toBeTruthy()
    expect(anaDetails?.invoices[0]?.plan).toBeTruthy()
    expect(
      anaDetails?.history.some((event) => event.type === 'INVOICE_IMPORTED')
    ).toBe(true)
    expect(
      anaDetails?.history.some(
        (event) =>
          event.type === 'INVOICE_PAID' && event.payerInvoiceIds.length > 0
      )
    ).toBe(true)
    expect(
      anaDetails?.history.some((event) =>
        [simulatedImportId, simulatedReconcileId].includes(event.runId ?? -1)
      )
    ).toBe(false)
  })

  it('rechaza una segunda ejecución simultánea sin falsear éxito', async () => {
    const coordinator = services.coordinator
    const pending = coordinator.import(true)
    await expect(coordinator.reconcile(true)).rejects.toThrow(
      'Ya hay una sincronización'
    )
    await pending
  })

  async function simulatePayment(
    body: Record<string, unknown>
  ): Promise<{ id_factura: number }> {
    const result = await simulateRequest('/__sim/pagar', body)
    const id = result.id_factura
    if (typeof id !== 'number')
      throw new Error('El simulador no devolvió el id_factura.')
    return { id_factura: id }
  }

  async function simulateRequest(
    path: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    assert.equal(response.status, 200)
    const result: unknown = await response.json()
    if (result === null || typeof result !== 'object' || Array.isArray(result))
      throw new Error('El simulador devolvió una respuesta inválida.')
    return result as Record<string, unknown>
  }
})

function sumOpenBalance(
  rows: readonly { status: string; balance: number }[]
): number {
  return (
    Math.round(
      rows
        .filter((row) => row.status === 'OPEN')
        .reduce((sum, row) => sum + row.balance, 0) * 100
    ) / 100
  )
}
