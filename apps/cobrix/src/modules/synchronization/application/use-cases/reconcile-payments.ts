import { classifyPayment, type PaymentEvidence } from '../../domain/payment.ts'
import { addMonths, today } from '../../domain/time.ts'
import type { SettingsRepository } from '../../../settings/application/ports/settings-repository.ts'
import type { ReconcileRepository } from '../ports/reconcile-repository.ts'
import type { IspGatewayFactory } from '../ports/isp-gateway.ts'
import type { InvoiceToReconcile } from '../reconcile-models.ts'
import type { RunItemDraft } from '../run-item-draft.ts'
import { SyncConflictError } from '../sync-conflict-error.ts'

interface PaymentRow extends PaymentEvidence {
  readonly installmentId: number
  readonly invoiceId: number
  readonly invoiceNumber: string
  readonly contractId: number
}

export class ReconcilePaymentsUseCase {
  private running = false

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly reconcileRepository: ReconcileRepository,
    private readonly ispGatewayFactory: IspGatewayFactory
  ) {}

  async execute(simulation: boolean): Promise<number> {
    if (this.running)
      throw new SyncConflictError('Ya hay una sincronización en curso.')
    this.running = true
    const startedAt = new Date().toISOString()
    const items: RunItemDraft[] = []
    let runId: number | null = null

    try {
      const settings = this.settingsRepository.get()
      if (!settings) throw new Error('La configuración no está inicializada.')
      runId = this.reconcileRepository.startRun(simulation, startedAt)
      const outstanding = this.reconcileRepository.listInvoices()
      const grouped = groupByContract(outstanding)
      const client = this.ispGatewayFactory.create(settings.isp)
      const paymentData = new Map<number, PaymentRow[]>()
      const fallbackData = new Map<number, Map<string, number>>()

      for (const [contractId, contractInvoices] of grouped) {
        const earliestPeriod = contractInvoices.reduce(
          (earliest, row) => (row.period < earliest ? row.period : earliest),
          contractInvoices[0]!.period
        )
        const startDate = `${addMonths(earliestPeriod, -1)}-01`
        const records = await client.getPaymentRows(
          contractId,
          startDate,
          today()
        )
        paymentData.set(contractId, parsePaymentRows(contractId, records))
      }

      for (const [contractId, contractInvoices] of grouped) {
        const needsCurrentMonthFallback = contractInvoices.some(
          (row) =>
            row.period === today().slice(0, 7) &&
            !paymentData
              .get(contractId)!
              .some(
                (payment) =>
                  String(payment.installmentId) === row.externalInstallmentId
              )
        )
        if (!needsCurrentMonthFallback) continue
        const rows = await client.getContractRows(contractId)
        const debtMap = new Map<string, number>()
        for (const value of rows) {
          if (!isRecord(value)) continue
          const installmentId = String(value.deuda_id ?? '')
          if (installmentId === '0') continue
          const amount = numberValue(value.deuda)
          if (amount === null) {
            throw new SyncConflictError(
              `La cuota ${installmentId} del contrato ${contractId} tiene saldo inválido.`
            )
          }
          if (debtMap.has(installmentId))
            throw new SyncConflictError(
              `La API repite la cuota ${installmentId} al consultar el contrato ${contractId}.`
            )
          debtMap.set(installmentId, amount)
        }
        fallbackData.set(contractId, debtMap)
      }

      const changes: Array<{
        readonly invoiceId: number
        readonly status: 'OPEN' | 'PAID'
        readonly balance: number
        readonly paidAt: string | null
        readonly payerInvoiceId: string | null
      }> = []
      let paidCount = 0
      let reopenedCount = 0

      for (const invoice of outstanding) {
        const records = paymentData
          .get(invoice.externalContractId)!
          .filter(
            (row) => String(row.installmentId) === invoice.externalInstallmentId
          )
        const evidence = classifyPayment(invoice.balance, records)
        const currentQuotaBalance = records[0]?.saldo
        const fallback = fallbackData
          .get(invoice.externalContractId)
          ?.get(invoice.externalInstallmentId)

        if (
          evidence.status === 'no_evidence' &&
          invoice.period === today().slice(0, 7) &&
          fallback !== undefined
        ) {
          items.push({
            contractId: invoice.externalContractId,
            installmentId: invoice.externalInstallmentId,
            customerId: invoice.customerId,
            period: invoice.period,
            outcome: 'no_evidence',
            reason:
              fallback > 0
                ? 'La cuota del mes sigue pendiente según el contrato; no hay evidencia de pago.'
                : 'La cuota del mes no aparece en pagos ni como pendiente; no se infiere que esté pagada.',
            amount: fallback,
          })
          continue
        }

        const nowPaid = evidence.status === 'paid'
        const wasPaid = invoice.status === 'PAID'
        if (nowPaid) paidCount++
        if (
          !nowPaid &&
          wasPaid &&
          ['partial', 'open', 'exempt', 'contradictory'].includes(
            evidence.status
          )
        )
          reopenedCount++

        const nextStatus = nowPaid
          ? 'PAID'
          : evidence.status === 'no_evidence'
            ? invoice.status
            : 'OPEN'
        const nextBalance = nowPaid
          ? 0
          : wasPaid &&
              ['partial', 'open'].includes(evidence.status) &&
              currentQuotaBalance !== undefined
            ? roundMoney(currentQuotaBalance)
            : wasPaid && ['exempt', 'contradictory'].includes(evidence.status)
              ? invoice.total
              : invoice.balance
        const paidAt = nextStatus === 'PAID' ? today() : null
        const payer = nowPaid
          ? (records.filter((record) => record.invoiceId > 0).at(-1)
              ?.invoiceNumber ?? null)
          : null

        if (
          (!simulation && nextStatus !== invoice.status) ||
          (!simulation && nextBalance !== invoice.balance)
        ) {
          changes.push({
            invoiceId: invoice.id,
            status: nextStatus,
            balance: nextBalance,
            paidAt: nextStatus === 'PAID' ? paidAt : null,
            payerInvoiceId: nextStatus === 'PAID' ? payer : null,
          })
        }

        const outcome =
          evidence.status === 'paid'
            ? wasPaid
              ? 'already_paid'
              : 'marked_paid'
            : evidence.status === 'partial'
              ? 'partial_payment'
              : evidence.status === 'exempt'
                ? 'exempt'
                : evidence.status === 'contradictory'
                  ? 'contradictory'
                  : evidence.status === 'no_evidence'
                    ? 'no_evidence'
                    : 'still_open'
        items.push({
          contractId: invoice.externalContractId,
          installmentId: invoice.externalInstallmentId,
          customerId: null,
          period: invoice.period,
          outcome,
          reason: evidence.reason,
          amount: currentQuotaBalance ?? invoice.balance,
          details: {
            payerInvoiceIds: records
              .filter((record) => record.invoiceId > 0)
              .map((record) => record.invoiceNumber),
            previousStatus: invoice.status,
          },
        })
      }

      const summary = {
        examined: outstanding.length,
        paid: paidCount,
        reopened: reopenedCount,
        items: countOutcomes(items),
      }
      this.reconcileRepository.completeRun({
        runId,
        simulation,
        changes,
        items,
        summary,
        finishedAt: new Date().toISOString(),
      })
      return runId
    } catch (error) {
      if (runId !== null)
        this.reconcileRepository.failRun({
          runId,
          items,
          error: safeMessage(error),
          summary: { items: countOutcomes(items) },
          finishedAt: new Date().toISOString(),
        })
      throw error
    } finally {
      this.running = false
    }
  }
}

function groupByContract(
  rows: readonly InvoiceToReconcile[]
): Map<number, InvoiceToReconcile[]> {
  const grouped = new Map<number, InvoiceToReconcile[]>()
  for (const row of rows) {
    const group = grouped.get(row.externalContractId) ?? []
    group.push(row)
    grouped.set(row.externalContractId, group)
  }
  return grouped
}

function parsePaymentRows(
  contractId: number,
  values: readonly unknown[]
): PaymentRow[] {
  return values.map((value) => {
    if (!isRecord(value) || !isRecord(value.detalle_pago))
      throw new SyncConflictError(
        `El libro de pagos del contrato ${contractId} contiene una fila inválida.`
      )
    const details = value.detalle_pago
    const rowContract = numberValue(
      details.id_contrato ?? value.id_contrato ?? value.fact_cod_contr
    )
    const installmentId = numberValue(details.id_cuota)
    const saldo = numberValue(details.saldo_cuota)
    const paid = numberValue(details.valor_pago)
    const discount = numberValue(details.descuento)
    const invoiceId = numberValue(value.id_factura)
    if (
      rowContract !== contractId ||
      installmentId === null ||
      installmentId <= 0 ||
      saldo === null ||
      paid === null ||
      discount === null ||
      invoiceId === null
    )
      throw new SyncConflictError(
        `El libro de pagos del contrato ${contractId} contiene datos contradictorios o incompletos.`
      )
    return {
      contractId,
      installmentId,
      saldo,
      paid,
      discount,
      invoiceId,
      invoiceNumber:
        typeof value.num_factura === 'string' ? value.num_factura : '',
    }
  })
}

function countOutcomes(items: readonly RunItemDraft[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.outcome] = (counts[item.outcome] ?? 0) + 1
    return counts
  }, {})
}

function numberValue(value: unknown): number | null {
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

function safeMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : 'Error desconocido durante la conciliación.'
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}
