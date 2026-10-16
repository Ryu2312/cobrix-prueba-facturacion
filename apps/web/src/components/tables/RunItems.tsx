import type { Run } from '../../types.ts'
import { formatMoney } from '../../lib/format.ts'
import { humanOutcome } from '../../lib/runFormat.ts'

export function RunItems({ items }: { items: NonNullable<Run['items']> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CONTRATO</th>
            <th>CUOTA</th>
            <th>PERÍODO</th>
            <th>RESULTADO</th>
            <th>MOTIVO</th>
            <th>IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.externalContractId ?? '—'}</td>
              <td className="mono">{item.externalInstallmentId ?? '—'}</td>
              <td>{item.period ?? '—'}</td>
              <td>
                <span className="tag">{humanOutcome(item.outcome)}</span>
              </td>
              <td>{item.reason}</td>
              <td>{item.amount === null ? '—' : formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
