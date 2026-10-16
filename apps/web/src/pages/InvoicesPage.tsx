import { useState } from 'react'
import { Link } from 'react-router'

import type { Invoice } from '../types.ts'
import { useResource } from '../hooks/useResource.ts'
import { Empty } from '../components/ui/Empty.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { InvoiceTable } from '../components/tables/InvoiceTable.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function InvoicesPage() {
  const [status, setStatus] = useState('')
  const { data, loading, error, refresh } = useResource<Invoice[]>(
    `/api/invoices${status ? `?status=${status}` : ''}`
  )
  return (
    <>
      <PageHeading
        eyebrow="CARTERA"
        title="Facturas"
        description="Cuotas importadas y estado de conciliación."
      />
      <section className="panel">
        <div className="table-toolbar">
          <div>
            <h2>Facturas</h2>
            <span className="muted">{data?.length ?? 0} registros</span>
          </div>
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">Abiertas</option>
            <option value="PAID">Pagadas</option>
          </select>
        </div>
        <Notice loading={loading} error={error} retry={refresh} />
        {data?.length ? (
          <InvoiceTable invoices={data} />
        ) : (
          !loading &&
          !error && (
            <Empty
              title="No hay facturas"
              text="Las facturas aparecerán al importar cuotas pendientes."
              action={
                <Link className="button button-secondary" to="/sync">
                  Ir a sincronización
                </Link>
              }
            />
          )
        )}
      </section>
    </>
  )
}
