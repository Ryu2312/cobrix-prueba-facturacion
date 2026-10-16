import type { Run } from '../../types.ts'
import { RunItems } from '../tables/RunItems.tsx'
import { RunSummary } from '../tables/RunSummary.tsx'
import { StatusPill } from '../ui/StatusPill.tsx'

export function RunResult({
  run,
  busy,
  onApply,
}: {
  run: Run
  busy?: boolean
  onApply?: () => void
}) {
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">RESULTADO · CORRIDA #{run.id}</div>
            <h2>
              {run.kind === 'IMPORT'
                ? 'Importación'
                : 'Actualización de pagadas'}{' '}
              {run.simulation ? 'simulada' : ''}
            </h2>
          </div>
          <StatusPill value={run.status} />
        </div>
        {run.error && <div className="notice notice-error">{run.error}</div>}
        {run.simulation && run.status === 'COMPLETED' && (
          <div className="notice notice-info" role="status">
            Vista previa solamente: estos cambios todavía no se guardaron en las
            facturas de Cobrix.
            {run.kind === 'RECONCILE' &&
              ' Si ya registraste pagos en el simulador ISP, ejecuta la conciliación para reflejarlos.'}
            {onApply && (
              <button
                className="button button-primary"
                disabled={busy}
                onClick={onApply}
              >
                {busy ? 'Procesando…' : 'Aplicar cambios'}
              </button>
            )}
          </div>
        )}
        <RunSummary summary={run.summary} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">DETALLE DE LA CORRIDA</div>
            <h2>Resultado por cuota</h2>
          </div>
          <span className="muted">{run.items?.length ?? 0} registros</span>
        </div>
        {run.items?.length ? (
          <RunItems items={run.items} />
        ) : (
          <p className="muted run-items-empty">No hay detalles por fila.</p>
        )}
      </section>
    </>
  )
}
