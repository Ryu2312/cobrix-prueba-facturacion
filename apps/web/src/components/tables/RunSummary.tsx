import type { JsonObject } from '../../types.ts'
import { formatMoney, formatNumber } from '../../lib/format.ts'
import { isObject } from '../../lib/guards.ts'
import { humanOutcome } from '../../lib/runFormat.ts'

const summaryLabels: Record<string, string> = {
  contracts: 'Contratos revisados',
  examined: 'Facturas revisadas',
  newInvoices: 'Facturas nuevas',
  newAmount: 'Importe nuevo',
  paid: 'Facturas pagadas',
  reopened: 'Facturas reabiertas',
}

const outcomeLabels: Record<string, string> = {
  already_imported: 'Ya importada',
  already_paid: 'Ya pagada',
  contradictory: 'Datos de pago contradictorios',
  exempt: 'Exonerada',
  excluded_currency: 'Moneda excluida',
  excluded_document: 'Documento excluido',
  excluded_identity: 'Identificación excluida',
  excluded_inconsistent_contract: 'Contrato inconsistente',
  excluded_residual: 'Saldo residual excluido',
  excluded_status: 'Excluida por estado',
  invalid_period: 'Período inválido',
  imported: 'Importada',
  marked_paid: 'Marcada como pagada',
  no_debt: 'Sin deuda pendiente',
  no_evidence: 'Sin evidencia de pago',
  outside_recent_limit: 'Fuera del límite de cuotas recientes',
  outside_window: 'Fuera de la ventana',
  partial_payment: 'Abono parcial',
  would_import: 'Se importaría',
  stopped_by_limit: 'Frenada por límite',
  still_open: 'Sigue abierta',
}

export function RunSummary({ summary }: { summary: JsonObject }) {
  const itemCounts = isObject(summary.items) ? summary.items : {}
  const rows = Object.entries(summary).flatMap(([key, value]) => {
    if (key === 'items' || typeof value === 'object' || value === null)
      return []
    return [
      {
        key,
        label: summaryLabels[key] ?? humanOutcome(key),
        value:
          key === 'newAmount' && typeof value === 'number'
            ? formatMoney(value)
            : formatSummaryValue(value),
      },
    ]
  })
  const outcomeRows = Object.entries(itemCounts).flatMap(([key, value]) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return []
    return [
      {
        key: `outcome-${key}`,
        label: outcomeLabels[key] ?? humanOutcome(key),
        value: formatNumber(value),
      },
    ]
  })
  const allRows = [...rows, ...outcomeRows]

  if (!allRows.length)
    return <p className="muted summary-empty">No hay resumen disponible.</p>

  return (
    <div className="table-wrap run-summary">
      <table>
        <thead>
          <tr>
            <th>RESUMEN</th>
            <th>RESULTADO</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatSummaryValue(value: unknown): string {
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return typeof value === 'string' ? value : '—'
}
