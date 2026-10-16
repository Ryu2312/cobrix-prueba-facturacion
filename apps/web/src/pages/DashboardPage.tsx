import { Link } from 'react-router'

import type { DashboardSummary } from '../types.ts'
import { formatMoney, formatNumber } from '../lib/format.ts'
import { useResource } from '../hooks/useResource.ts'
import { Empty } from '../components/ui/Empty.tsx'
import { Metric } from '../components/ui/Metric.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { RunTable } from '../components/tables/RunTable.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function DashboardPage() {
  const { data, loading, error, refresh } =
    useResource<DashboardSummary>('/api/summary')
  const totals = data?.totals
  const recentRuns = data?.recentRuns ?? []
  return (
    <>
      <PageHeading
        eyebrow="VISTA GENERAL"
        title="Resumen"
        description="Estado de la cartera y de la integración con el administrador del ISP."
        actions={
          <Link className="button button-primary" to="/sync">
            Nueva sincronización <span>↗</span>
          </Link>
        }
      />
      <Notice loading={loading} error={error} retry={refresh} />
      <div className="stats-grid">
        <Metric
          label="Clientes importados"
          value={formatNumber(totals?.customers)}
          detail="Titulares únicos"
          icon="01"
        />
        <Metric
          label="Contratos"
          value={formatNumber(totals?.contracts)}
          detail="En la cartera sincronizada"
          icon="02"
        />
        <Metric
          label="Facturas abiertas"
          value={formatNumber(totals?.openInvoices)}
          detail="Pendientes de cobro"
          icon="03"
          tone="amber"
        />
        <Metric
          label="Facturas pagadas"
          value={formatNumber(totals?.paidInvoices)}
          detail="Conciliadas con el ISP"
          icon="04"
          tone="green"
        />
        <Metric
          label="Por cobrar"
          value={formatMoney(totals?.amountDue)}
          detail="Saldo abierto en USD"
          icon="05"
          tone="green"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">ACTIVIDAD RECIENTE</div>
            <h2>Últimas corridas</h2>
          </div>
          <Link className="text-link" to="/runs">
            Ver historial <span>→</span>
          </Link>
        </div>
        {recentRuns.length ? (
          <RunTable runs={recentRuns} />
        ) : (
          <Empty
            title="Todavía no hay corridas"
            text="Ejecuta una simulación para revisar qué se importaría antes de guardar cambios."
            action={
              <Link to="/sync" className="button button-secondary">
                Ir a sincronización
              </Link>
            }
          />
        )}
      </section>
      <section className="panel provider-panel">
        <div className="provider-icon">↔</div>
        <div className="provider-copy">
          <div className="eyebrow">PROVEEDOR ISP</div>
          <h2>
            {data?.provider.configured
              ? 'Proveedor configurado'
              : 'Proveedor por configurar'}
          </h2>
          <p>
            {data?.schedule.enabled
              ? `Corrida automática activa a las ${data.schedule.time} (${data.schedule.timeZone}).`
              : 'La corrida automática está desactivada.'}{' '}
            La base del ISP permanece separada.
          </p>
        </div>
        <Link className="text-link" to="/settings">
          Revisar configuración <span>→</span>
        </Link>
      </section>
    </>
  )
}
