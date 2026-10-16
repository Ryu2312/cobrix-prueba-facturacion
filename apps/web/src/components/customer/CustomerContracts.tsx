import type { Contract } from '../../types.ts'
import { formatMoney } from '../../lib/format.ts'
import { Empty } from '../ui/Empty.tsx'
import { StatusPill } from '../ui/StatusPill.tsx'

export function CustomerContracts({ contracts }: { contracts: Contract[] }) {
  return (
    <section className="panel customer-contracts">
      <div className="panel-heading">
        <h2>Contratos en el administrador</h2>
      </div>
      {contracts.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CONTRATO</th>
                <th>ESTADO</th>
                <th>PLAN</th>
                <th>SUCURSAL</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.externalId}>
                  <td>
                    <span className="mono">{contract.code}</span>
                    <small>
                      {contract.address || 'Dirección no registrada'}
                    </small>
                  </td>
                  <td>
                    <StatusPill value={contract.status} />
                  </td>
                  <td>
                    {contract.plan}
                    <small>
                      {formatMoney(contract.price)}/mes · {contract.currency}
                    </small>
                  </td>
                  <td>{contract.branch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No hay contratos"
          text="Todavía no se han importado contratos para este cliente."
        />
      )}
    </section>
  )
}
