import {
  contractIsImportable,
  isUsdCoherent,
  type ContractSnapshot,
} from '../../domain/contract.ts'
import { normalizeIdentity } from '../../domain/identity.ts'
import { parsePeriod } from '../../domain/period.ts'
import { addMonths, today } from '../../domain/time.ts'
import type { Settings } from '../../../settings/domain/settings.ts'
import type { SettingsRepository } from '../../../settings/application/ports/settings-repository.ts'
import type {
  ImportInvoiceDraft,
  ImportRepository,
} from '../ports/import-repository.ts'
import type { IspGatewayFactory } from '../ports/isp-gateway.ts'
import type { RunItemDraft } from '../run-item-draft.ts'
import { SyncConflictError } from '../sync-conflict-error.ts'

interface ParsedRow extends ContractSnapshot {
  readonly installmentId: string
  readonly debt: number
  readonly period: string | null
}

export class ImportContractsUseCase {
  private running = false

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly importRepository: ImportRepository,
    private readonly ispGatewayFactory: IspGatewayFactory
  ) {}

  isRunning(): boolean {
    return this.running
  }

  async execute(simulation: boolean): Promise<number> {
    if (this.running)
      throw new SyncConflictError('Ya hay una sincronización en curso.')
    this.running = true
    const startedAt = new Date().toISOString()
    const items: RunItemDraft[] = []
    let runId: number | null = null

    try {
      const settings = this.requireSettings()
      runId = this.importRepository.startRun(simulation, startedAt)
      const client = this.ispGatewayFactory.create(settings.isp)
      const contractIds = await client.listContractIds()
      const candidates: ParsedRow[] = []

      for (const contractId of contractIds) {
        const rawRows = await client.getContractRows(contractId)
        let parsed: { readonly rows: ParsedRow[] }
        try {
          parsed = validateContractRows(contractId, rawRows)
        } catch (error) {
          if (!(error instanceof SyncConflictError)) throw error
          items.push({
            contractId,
            installmentId: null,
            customerId: null,
            period: null,
            outcome: 'excluded_inconsistent_contract',
            reason: error.message,
            amount: null,
          })
          continue
        }
        if (!parsed.rows.length) {
          items.push({
            contractId,
            installmentId: null,
            customerId: null,
            period: null,
            outcome: 'no_debt',
            reason: 'El contrato no tiene cuotas pendientes.',
            amount: 0,
          })
          continue
        }

        const first = parsed.rows[0]!
        const identity = normalizeIdentity(first.identity)
        if (!identity) {
          for (const row of parsed.rows)
            items.push(
              item(
                row,
                'excluded_identity',
                'La identificación del titular no es válida.'
              )
            )
          continue
        }
        if (!contractIsImportable(first, settings.importPolicy.statuses)) {
          for (const row of parsed.rows)
            items.push(
              item(
                row,
                'excluded_status',
                `Estado no importable: ${first.status}.`,
                identity.id
              )
            )
          continue
        }
        if (settings.importPolicy.excludesDocumentType(identity.documentType)) {
          for (const row of parsed.rows)
            items.push(
              item(
                row,
                'excluded_document',
                `Tipo de documento excluido: ${identity.documentType}.`,
                identity.id
              )
            )
          continue
        }

        const billable = parsed.rows.filter(
          (row) => row.installmentId !== '0' && row.debt > 0.005
        )
        if (
          first.currency !== 'USD' ||
          billable.some(
            (row) => !isUsdCoherent(row.currency, row.price, row.debt)
          )
        ) {
          for (const row of billable)
            items.push(
              item(
                row,
                'excluded_currency',
                'La moneda no es USD coherente con el precio del plan.',
                identity.id
              )
            )
          continue
        }

        const eligible: ParsedRow[] = []
        for (const row of parsed.rows) {
          if (row.installmentId === '0') {
            items.push(
              item(
                row,
                'no_debt',
                'La API usa deuda_id 0 para indicar que no hay deuda.',
                identity.id
              )
            )
            continue
          }
          if (row.debt <= 0.005) {
            items.push(
              item(
                row,
                'excluded_residual',
                'El saldo es cero o menor a un centavo.',
                identity.id
              )
            )
            continue
          }
          if (!row.period) {
            items.push(
              item(
                row,
                'invalid_period',
                'No se pudo determinar el período a partir del detalle de deuda.',
                identity.id
              )
            )
            continue
          }
          if (
            settings.importPolicy.importWindowMonths !== null &&
            row.period <
              addMonths(
                today().slice(0, 7),
                -settings.importPolicy.importWindowMonths
              )
          ) {
            items.push(
              item(
                row,
                'outside_window',
                'La cuota queda fuera de la ventana de importación.',
                identity.id
              )
            )
            continue
          }
          eligible.push(row)
        }

        eligible.sort(
          (a, b) =>
            a.period!.localeCompare(b.period!) ||
            a.installmentId.localeCompare(b.installmentId)
        )
        const limited =
          settings.importPolicy.maxInstallmentsPerContract === null
            ? eligible
            : eligible.slice(-settings.importPolicy.maxInstallmentsPerContract)
        const excludedRecent = new Set(
          eligible.filter((row) => !limited.includes(row))
        )
        for (const row of eligible) {
          if (excludedRecent.has(row)) {
            items.push(
              item(
                row,
                'outside_recent_limit',
                'La cuota no está entre las cuotas recientes seleccionadas.',
                identity.id
              )
            )
          } else {
            candidates.push(row)
          }
        }
      }

      const existingRows = this.importRepository.findExistingInstallments(
        candidates.map((row) => row.contractId)
      )
      const existingKeys = new Set(
        existingRows.map((row) => `${row.contractId}:${row.installmentId}`)
      )
      const pending = candidates.filter((row) => {
        if (existingKeys.has(`${row.contractId}:${row.installmentId}`)) {
          const identity = normalizeIdentity(row.identity)
          items.push(
            item(
              row,
              'already_imported',
              'La cuota ya existe en Cobrix; no se creó otra factura.',
              identity?.id ?? null
            )
          )
          return false
        }
        return true
      })

      let newCount = 0
      let newAmount = 0
      let stopped = false
      const accepted: ParsedRow[] = []
      for (const row of pending) {
        const overCount =
          settings.importPolicy.maxNewInvoices !== null &&
          newCount >= settings.importPolicy.maxNewInvoices
        const overAmount =
          settings.importPolicy.maxNewAmountMinorUnits !== null &&
          newAmount + row.debt >
            settings.importPolicy.maxNewAmountMinorUnits / 100 + 0.005
        if (stopped || overCount || overAmount) {
          stopped = true
          items.push(
            item(
              row,
              'stopped_by_limit',
              'La cuota excedería el tope configurado para esta corrida.',
              normalizeIdentity(row.identity)?.id ?? null
            )
          )
          continue
        }
        accepted.push(row)
        newCount++
        newAmount += row.debt
      }

      for (const row of accepted)
        items.push(
          item(
            row,
            simulation ? 'would_import' : 'imported',
            simulation
              ? 'Se importaría una factura abierta.'
              : 'Factura abierta importada.',
            normalizeIdentity(row.identity)?.id ?? null
          )
        )

      const summary = {
        contracts: contractIds.length,
        newInvoices: accepted.length,
        newAmount: roundMoney(accepted.reduce((sum, row) => sum + row.debt, 0)),
        items: countOutcomes(items),
      }

      const acceptedInvoices: ImportInvoiceDraft[] = accepted.flatMap((row) => {
        const identity = normalizeIdentity(row.identity)
        if (!identity || !row.period) return []
        return [
          {
            contractId: row.contractId,
            customerId: identity.id,
            documentType: identity.legalEntity ? 'juridical' : 'natural',
            code: row.code,
            status: row.status,
            name: row.name,
            email: row.email,
            phone: row.phone,
            address: row.address,
            plan: row.plan,
            price: row.price,
            currency: row.currency,
            branch: row.branch,
            installmentId: row.installmentId,
            debt: row.debt,
            period: row.period,
          },
        ]
      })
      this.importRepository.completeRun({
        runId,
        simulation,
        accepted: acceptedInvoices,
        graceDays: settings.importPolicy.graceDays,
        items,
        summary,
        finishedAt: new Date().toISOString(),
      })
      return runId
    } catch (error) {
      const message = safeErrorMessage(error)
      if (runId !== null)
        this.importRepository.failRun({
          runId,
          items,
          error: message,
          summary: { items: countOutcomes(items) },
          finishedAt: new Date().toISOString(),
        })
      throw error
    } finally {
      this.running = false
    }
  }

  private requireSettings(): Settings {
    const settings = this.settingsRepository.get()
    if (!settings) throw new Error('La configuración no está inicializada.')
    return settings
  }
}

function validateContractRows(
  requestedId: number,
  rawRows: readonly unknown[]
): { readonly rows: ParsedRow[] } {
  const parsed: ParsedRow[] = []
  const keys = new Set<string>()
  for (const value of rawRows) {
    if (!isRecord(value))
      throw new SyncConflictError(
        `El contrato ${requestedId} contiene una fila que no es un objeto.`
      )
    const contractId = numberField(value.contrato_id)
    if (contractId !== requestedId)
      throw new SyncConflictError(
        `La API devolvió una fila de otro contrato al consultar ${requestedId}.`
      )
    const installmentId =
      typeof value.deuda_id === 'string'
        ? value.deuda_id
        : String(value.deuda_id ?? '')
    const amount = numberField(value.deuda)
    const price = numberField(value.precio_servicio)
    if (
      !installmentId ||
      amount === null ||
      amount < 0 ||
      price === null ||
      price < 0
    )
      throw new SyncConflictError(
        `El contrato ${requestedId} contiene datos de cuota inválidos.`
      )
    const key = `${contractId}:${installmentId}`
    if (keys.has(key))
      throw new SyncConflictError(
        `El contrato ${requestedId} repite la cuota ${installmentId}.`
      )
    keys.add(key)

    const fields = [
      value.codigo,
      value.estado,
      value.identificacion_contrato,
      value.nombre_contrato,
      value.nombre_plan,
      value.moneda_sigla,
      value.sigla_sucursal,
    ]
    if (fields.some((field) => typeof field !== 'string'))
      throw new SyncConflictError(
        `El contrato ${requestedId} no incluye los campos comerciales requeridos.`
      )
    const period =
      installmentId === '0' ? null : parsePeriod(value.detalle_deuda)
    parsed.push({
      contractId,
      code: value.codigo as string,
      status: value.estado as string,
      identity: value.identificacion_contrato as string,
      name: value.nombre_contrato as string,
      email: typeof value.email === 'string' ? value.email : '',
      phone: typeof value.telefono === 'string' ? value.telefono : '',
      address: typeof value.direccion === 'string' ? value.direccion : '',
      plan: value.nombre_plan as string,
      price,
      currency: value.moneda_sigla as string,
      branch: value.sigla_sucursal as string,
      installmentId,
      debt: amount,
      period,
    })
  }

  if (parsed.length > 1) {
    const first = parsed[0]!
    if (
      parsed.some(
        (row) =>
          row.status !== first.status ||
          row.identity !== first.identity ||
          row.code !== first.code ||
          row.plan !== first.plan ||
          row.currency !== first.currency ||
          Math.abs(row.price - first.price) > 0.005
      )
    )
      throw new SyncConflictError(
        `Las filas del contrato ${requestedId} se contradicen en datos comerciales.`
      )
  }
  return { rows: parsed }
}

function item(
  row: ParsedRow,
  outcome: string,
  reason: string,
  customerId: string | null = null
): RunItemDraft {
  return {
    contractId: row.contractId,
    installmentId: row.installmentId,
    customerId,
    period: row.period,
    outcome,
    reason,
    amount: row.debt,
  }
}

function countOutcomes(items: readonly RunItemDraft[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.outcome] = (counts[item.outcome] ?? 0) + 1
    return counts
  }, {})
}

function numberField(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500)
  return 'Error desconocido durante la importación.'
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
