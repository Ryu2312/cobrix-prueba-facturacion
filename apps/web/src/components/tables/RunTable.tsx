import { Link } from 'react-router'

import type { Run } from '../../types.ts'
import { formatDateTime } from '../../lib/format.ts'
import { summaryText } from '../../lib/runFormat.ts'
import { StatusPill } from '../ui/StatusPill.tsx'

export function RunTable({ runs }: { runs: Run[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TIPO</th>
            <th>FECHA</th>
            <th>MODO</th>
            <th>ESTADO</th>
            <th>RESUMEN</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <strong>
                  {run.kind === 'IMPORT' ? 'Importación' : 'Actualizar pagadas'}
                </strong>
                <small>Corrida #{run.id}</small>
              </td>
              <td>{formatDateTime(run.startedAt)}</td>
              <td>
                {run.simulation ? (
                  <span className="tag tag-sim">Simulación</span>
                ) : (
                  'Real'
                )}
              </td>
              <td>
                <StatusPill value={run.status} />
              </td>
              <td>{summaryText(run.summary)}</td>
              <td>
                <Link
                  className="row-link"
                  to={`/runs/${run.id}`}
                  aria-label={`Ver corrida ${run.id}`}
                >
                  ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
