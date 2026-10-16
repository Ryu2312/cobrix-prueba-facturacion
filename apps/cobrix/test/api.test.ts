import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createServices } from '../src/bootstrap/create-services.ts'
import { createApi } from '../src/server.ts'
import { openDatabase } from '../src/modules/shared/infrastructure/database.ts'
import {
  contracts,
  customers,
  invoices,
  runs,
} from '../drizzle/schema.drizzle.ts'
import { SqliteSettingsRepository } from '../src/modules/settings/infrastructure/sqlite-settings-repository.ts'
import { seedSettings } from '../src/modules/settings/infrastructure/settings-seed.ts'

describe('API Cobrix', () => {
  let directory: string
  let database: ReturnType<typeof openDatabase>
  let services: ReturnType<typeof createServices>
  let app: ReturnType<typeof createApi>

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'cobrix-api-'))
    database = openDatabase({
      path: join(directory, 'cobrix.sqlite'),
      migrationsFolder: join(process.cwd(), 'drizzle', 'migrations'),
    })
    seedSettings(new SqliteSettingsRepository(database.db))
    services = createServices(database.db)
    app = createApi(services)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    services.scheduler.close()
    database.close()
    rmSync(directory, { recursive: true, force: true })
  })

  it('limita el resumen del dashboard al estado del proveedor, sin enviar su URL o usuario', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/summary' })
    const body = parseJson(response.payload)
    expect(isRecord(body.provider)).toBe(true)
    if (isRecord(body.provider)) {
      expect(body.provider).toEqual({ configured: true })
      expect(body.provider).not.toHaveProperty('baseUrl')
      expect(body.provider).not.toHaveProperty('username')
      expect(body.provider).not.toHaveProperty('password')
    }
    expect(body).not.toHaveProperty('company')
    expect(isRecord(body.totals) && body.totals).toHaveProperty('paidInvoices')
    expect(isRecord(body.schedule) && body.schedule).toHaveProperty('enabled')
  })

  it('calcula los totales y conserva las últimas corridas en el resumen', async () => {
    const timestamp = '2026-10-16T10:00:00.000Z'
    database.db
      .insert(customers)
      .values({
        id: 'V12345678',
        name: 'Cliente de prueba',
        documentType: 'V',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(contracts)
      .values({
        externalId: 101,
        customerId: 'V12345678',
        code: 'CON-101',
        status: 'ACTIVO',
        plan: 'Fibra',
        address: 'Caracas',
        price: 15,
        currency: 'USD',
        branch: 'CCS',
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(invoices)
      .values([
        {
          externalContractId: 101,
          externalInstallmentId: 'OPEN-1',
          period: '2026-10',
          dueAt: timestamp,
          cutAt: timestamp,
          currency: 'USD',
          total: 15,
          balance: 12,
          status: 'OPEN',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          externalContractId: 101,
          externalInstallmentId: 'PAID-1',
          period: '2026-09',
          dueAt: timestamp,
          cutAt: timestamp,
          currency: 'USD',
          total: 15,
          balance: 0,
          status: 'PAID',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ])
      .run()
    database.db
      .insert(runs)
      .values({
        kind: 'IMPORT',
        simulation: false,
        status: 'COMPLETED',
        summary: JSON.stringify({ newInvoices: 1 }),
        startedAt: timestamp,
        finishedAt: timestamp,
      })
      .run()

    const body = parseJson(
      (await app.inject({ method: 'GET', url: '/api/summary' })).payload
    )

    expect(body.totals).toEqual({
      customers: 1,
      contracts: 1,
      openInvoices: 1,
      paidInvoices: 1,
      amountDue: 12,
      currency: 'USD',
    })
    expect(body.recentRuns).toEqual([
      expect.objectContaining({
        kind: 'IMPORT',
        status: 'COMPLETED',
        summary: { newInvoices: 1 },
      }),
    ])
  })

  it('busca clientes y conserva el contrato de su expediente', async () => {
    const timestamp = '2026-10-16T10:00:00.000Z'
    database.db
      .insert(customers)
      .values({
        id: 'V12345678',
        name: 'Cliente de prueba',
        documentType: 'natural',
        email: 'cliente@example.test',
        phone: '555-0100',
        address: 'Caracas',
        origin: 'ISP',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(contracts)
      .values({
        externalId: 101,
        customerId: 'V12345678',
        code: 'CON-101',
        status: 'ACTIVO',
        plan: 'Fibra',
        address: 'Caracas',
        price: 15,
        currency: 'USD',
        branch: 'CCS',
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(invoices)
      .values({
        externalContractId: 101,
        externalInstallmentId: 'OPEN-1',
        period: '2026-10',
        dueAt: timestamp,
        cutAt: timestamp,
        currency: 'USD',
        total: 15,
        balance: 12,
        status: 'OPEN',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run()

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/customers?q=Cliente',
    })
    expect(listResponse.statusCode).toBe(200)
    const list = JSON.parse(listResponse.payload) as Array<
      Record<string, unknown>
    >
    expect(list).toEqual([
      {
        id: 'V12345678',
        name: 'Cliente de prueba',
        documentType: 'natural',
        email: 'cliente@example.test',
        phone: '555-0100',
        contracts: 1,
        openInvoices: 1,
        paidInvoices: 0,
        amountDue: 12,
        oldestDueAt: timestamp,
      },
    ])

    const detailResponse = await app.inject({
      method: 'GET',
      url: '/api/customers/V12345678',
    })
    expect(detailResponse.statusCode).toBe(200)
    const detail = parseJson(detailResponse.payload)
    expect(detail).toMatchObject({
      id: 'V12345678',
      name: 'Cliente de prueba',
      address: 'Caracas',
      contracts: [{ externalId: 101, code: 'CON-101' }],
      invoices: [
        {
          externalInstallmentId: 'OPEN-1',
          externalContractId: 101,
          balance: 12,
          status: 'OPEN',
        },
      ],
      history: [
        {
          type: 'CUSTOMER_CREATED',
          externalContractId: 101,
        },
      ],
    })
  })

  it('lista facturas por vencimiento y filtra por estado', async () => {
    const timestamp = '2026-10-16T10:00:00.000Z'
    database.db
      .insert(customers)
      .values({
        id: 'V12345678',
        name: 'Cliente de prueba',
        documentType: 'natural',
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(contracts)
      .values({
        externalId: 201,
        customerId: 'V12345678',
        code: 'CON-201',
        status: 'ACTIVO',
        plan: 'Fibra',
        address: 'Caracas',
        price: 15,
        currency: 'USD',
        branch: 'CCS',
        updatedAt: timestamp,
      })
      .run()
    database.db
      .insert(invoices)
      .values([
        {
          externalContractId: 201,
          externalInstallmentId: 'OPEN-1',
          period: '2026-09',
          dueAt: '2026-09-01T00:00:00.000Z',
          cutAt: '2026-09-04T00:00:00.000Z',
          currency: 'USD',
          total: 15,
          balance: 15,
          status: 'OPEN',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          externalContractId: 201,
          externalInstallmentId: 'PAID-1',
          period: '2026-10',
          dueAt: '2026-10-01T00:00:00.000Z',
          cutAt: '2026-10-04T00:00:00.000Z',
          currency: 'USD',
          total: 15,
          balance: 0,
          status: 'PAID',
          paidAt: timestamp,
          payerInvoiceId: 'ISP-44',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ])
      .run()

    const allResponse = await app.inject({
      method: 'GET',
      url: '/api/invoices',
    })
    expect(allResponse.statusCode).toBe(200)
    const all = JSON.parse(allResponse.payload) as Array<
      Record<string, unknown>
    >
    expect(all).toHaveLength(2)
    expect(all.map((invoice) => invoice.status)).toEqual(['PAID', 'OPEN'])
    expect(all[0]).toMatchObject({
      externalContractId: 201,
      customerId: 'V12345678',
      contractCode: 'CON-201',
      externalInstallmentId: 'PAID-1',
      payerInvoiceId: 'ISP-44',
    })
    expect(all[0]).not.toHaveProperty('contractId')

    const openResponse = await app.inject({
      method: 'GET',
      url: '/api/invoices?status=OPEN',
    })
    expect(openResponse.statusCode).toBe(200)
    expect(JSON.parse(openResponse.payload)).toMatchObject([
      { status: 'OPEN', externalInstallmentId: 'OPEN-1' },
    ])

    const invalidFilter = await app.inject({
      method: 'GET',
      url: '/api/invoices?status=UNKNOWN',
    })
    expect(invalidFilter.statusCode).toBe(400)
  })

  it('sirve Settings V2 por las rutas públicas existentes y conserva el secreto omitido', async () => {
    let scheduleRefreshes = 0
    const configureScheduler = services.scheduler.configure.bind(
      services.scheduler
    )
    services.scheduler.configure = () => {
      scheduleRefreshes++
      configureScheduler()
    }
    const before = await app.inject({ method: 'GET', url: '/api/settings' })
    expect(before.statusCode).toBe(200)
    expect(
      (await app.inject({ method: 'GET', url: '/api/v2/settings' })).statusCode
    ).toBe(404)

    const beforeBody = parseJson(before.payload)
    expect(isRecord(beforeBody.provider)).toBe(true)
    if (isRecord(beforeBody.provider)) {
      expect(beforeBody.provider).not.toHaveProperty('password')
      expect(beforeBody.provider.passwordSet).toBe(true)
    }

    const settingsUpdate = {
      company: {
        name: 'Cobrix V2',
        taxId: 'J-12345678-9',
        collectionEmail: 'cobros@example.test',
      },
      provider: {
        baseUrl: 'http://127.0.0.1:4310',
        username: 'cobrix',
        password: '',
      },
      sync: {
        statuses: ['ACTIVO', 'CORTADO'],
        importWindowMonths: 3,
        maxInstallmentsPerContract: null,
        graceDays: 3,
        maxNewInvoices: 100,
        maxNewAmount: 500,
        excludedDocumentTypes: [],
        scheduleEnabled: false,
        scheduleTime: '02:00',
      },
    }

    const update = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: settingsUpdate,
    })
    expect(update.statusCode).toBe(200)
    const updated = parseJson(update.payload)
    expect(updated).toEqual({ ok: true })
    const after = parseJson(
      (await app.inject({ method: 'GET', url: '/api/settings' })).payload
    )
    expect(after.company).toMatchObject({ name: 'Cobrix V2' })
    expect(after.sync).toMatchObject({ graceDays: 3 })
    expect(isRecord(after.provider) && after.provider.passwordSet).toBe(true)
    expect(scheduleRefreshes).toBe(1)

    const clearImportLimits = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        ...settingsUpdate,
        sync: {
          ...settingsUpdate.sync,
          importWindowMonths: null,
          maxNewInvoices: null,
          maxNewAmount: null,
        },
      },
    })
    expect(clearImportLimits.statusCode).toBe(200)
    expect(clearImportLimits.payload).toBe('{"ok":true}')
    const clearedSettings = parseJson(
      (await app.inject({ method: 'GET', url: '/api/settings' })).payload
    )
    expect(clearedSettings.sync).toMatchObject({
      importWindowMonths: null,
      maxNewInvoices: null,
      maxNewAmount: null,
      graceDays: 3,
    })

    const invalid = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        ...settingsUpdate,
        provider: {
          ...settingsUpdate.provider,
          baseUrl: 'file:///etc/passwd',
        },
      },
    })
    expect(invalid.statusCode).toBe(400)

    const credentialsInUrl = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        provider: { baseUrl: 'https://user:secret@isp.example.test' },
      },
    })
    expect(credentialsInUrl.statusCode).toBe(400)
  })

  it('valida configuración y distingue recursos no encontrados', async () => {
    const invalid = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: { sync: { graceDays: 61 } },
    })
    expect(invalid.statusCode).toBe(400)

    const missing = await app.inject({
      method: 'GET',
      url: '/api/customers/NO-SUCH-CUSTOMER',
    })
    expect(missing.statusCode).toBe(404)
    expect(
      (await app.inject({ method: 'GET', url: '/api/health' })).statusCode
    ).toBe(200)
  })
})

function parseJson(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed))
    throw new Error('El endpoint respondió JSON con una forma inválida.')
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
