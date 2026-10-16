import { useState } from 'react'
import { Link } from 'react-router'

import type { Run } from '../types.ts'
import { api } from '../lib/api.ts'
import { useResource } from '../hooks/useResource.ts'
import { Empty } from '../components/ui/Empty.tsx'
import { OperationCard } from '../components/sync/OperationCard.tsx'
import { RunResult } from '../components/sync/RunResult.tsx'
import { RunTable } from '../components/tables/RunTable.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function SyncPage() {
  const {
    data: runs,
    loading: runsLoading,
    error: runsError,
    refresh: refreshRuns,
  } = useResource<Run[]>('/api/runs')
  const [result, setResult] = useState<Run | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function execute(kind: 'import' | 'reconcile', simulation: boolean) {
    if (
      !simulation &&
      !window.confirm(
        kind === 'import'
          ? '¿Ejecutar la importación real? Se crearán registros comerciales en Cobrix.'
          : '¿Actualizar el estado de las facturas con la evidencia actual del ISP?'
      )
    )
      return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const run = await api<Run>(`/api/sync/${kind}`, {
        method: 'POST',
        body: JSON.stringify({ simulation }),
      })
      setResult(run)
      refreshRuns()
      setNotice(
        simulation
          ? 'Vista previa completada. No se guardaron cambios en Cobrix.'
          : 'Corrida completada y registrada en el historial.'
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo ejecutar la sincronización.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="OPERACIÓN"
        title="Sincronización"
        description="Simula primero para revisar resultados; luego ejecuta la operación real."
      />
      <div className="sync-grid">
        <OperationCard
          number="01"
          title="Importar cuotas"
          text="Recorre los contratos, clasifica cuotas pendientes y crea clientes y facturas que aún no existen."
          onSimulate={() => void execute('import', true)}
          onRun={() => void execute('import', false)}
          busy={busy}
        />
        <OperationCard
          number="02"
          title="Actualizar pagadas"
          text="Después de registrar un pago en el simulador ISP, aplícalo en Cobrix. La vista previa no guarda cambios; los abonos parciales no cierran la factura."
          actionLabel="Aplicar en Cobrix"
          onSimulate={() => void execute('reconcile', true)}
          onRun={() => void execute('reconcile', false)}
          busy={busy}
        />
      </div>
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice notice-success" role="status">
          {notice}
        </div>
      )}
      {result && (
        <RunResult
          run={result}
          busy={busy}
          onApply={() =>
            void execute(
              result.kind === 'IMPORT' ? 'import' : 'reconcile',
              false
            )
          }
        />
      )}
      <div className="callout">
        <strong>Regla de seguridad</strong>
        <span>
          La simulación usa los mismos clasificadores que una corrida real, pero
          no escribe clientes, contratos ni facturas.
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">ACTIVIDAD RECIENTE</div>
            <h2>Historial de corridas</h2>
          </div>
          <Link className="text-link" to="/runs">
            Ver historial completo <span>→</span>
          </Link>
        </div>
        {runsLoading && (
          <div className="loading-line">
            <span className="spinner" />
            Cargando corridas…
          </div>
        )}
        {runsError && (
          <div className="notice notice-error" role="alert">
            {runsError}
            <button className="text-link" onClick={refreshRuns}>
              Reintentar
            </button>
          </div>
        )}
        {!runsLoading &&
          !runsError &&
          (runs?.length ? (
            <RunTable runs={runs.slice(0, 5)} />
          ) : (
            <Empty
              title="Todavía no hay corridas"
              text="Las ejecuciones y simulaciones aparecerán aquí."
            />
          ))}
      </section>
    </>
  )
}
