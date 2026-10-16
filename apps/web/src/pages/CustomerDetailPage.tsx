import { Link, useParams } from 'react-router'

import type { CustomerDetail } from '../types.ts'
import { formatMoney } from '../lib/format.ts'
import { useResource } from '../hooks/useResource.ts'
import { CustomerContracts } from '../components/customer/CustomerContracts.tsx'
import { CustomerHistory } from '../components/customer/CustomerHistory.tsx'
import { CustomerInformation } from '../components/customer/CustomerInformation.tsx'
import { InvoiceTable } from '../components/tables/InvoiceTable.tsx'
import { Metric } from '../components/ui/Metric.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function CustomerDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error, refresh } = useResource<CustomerDetail>(
    `/api/customers/${encodeURIComponent(id)}`
  )
  const invoices = data?.invoices ?? []
  const openInvoices = invoices.filter((invoice) => invoice.status === 'OPEN')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'PAID')
  const documentType =
    data?.documentType === 'juridical' ? 'Persona jurídica' : 'Persona natural'

  return (
    <>
      <Link className="back-link" to="/customers">
        ← Clientes
      </Link>
      <PageHeading
        eyebrow="EXPEDIENTE DEL CLIENTE"
        title={loading ? 'Cargando…' : (data?.name ?? 'Cliente')}
        description={data ? `${documentType} · ${formatDocument(data.id)}` : id}
      />
      <Notice loading={loading} error={error} retry={refresh} />
      {data && (
        <>
          <div className="stats-grid stats-four">
            <Metric
              label="Deuda abierta"
              value={formatMoney(
                openInvoices.reduce((sum, invoice) => sum + invoice.balance, 0)
              )}
              detail="Saldo pendiente"
              icon="01"
              tone="amber"
            />
            <Metric
              label="Facturas abiertas"
              value={openInvoices.length}
              detail="Por cobrar"
              icon="02"
            />
            <Metric
              label="Facturas pagadas"
              value={paidInvoices.length}
              detail="Conciliadas"
              icon="03"
              tone="green"
            />
            <Metric
              label="Contratos"
              value={data.contracts.length}
              detail="En el administrador"
              icon="04"
            />
          </div>

          <div className="customer-overview">
            <CustomerInformation customer={data} />
            <CustomerContracts contracts={data.contracts} />
          </div>

          <section className="panel customer-invoices">
            <div className="panel-heading">
              <h2>Facturas</h2>
              <span className="muted">
                Una factura por cuota del administrador
              </span>
            </div>
            <InvoiceTable invoices={invoices} variant="customer" />
            <p className="customer-invoice-note">
              El vencimiento corresponde al primer día del período. El
              administrador no entrega un vencimiento por cuota; la fecha de
              corte suma los días de gracia configurados.
            </p>
          </section>

          <CustomerHistory events={data.history} />
        </>
      )}
    </>
  )
}

function formatDocument(value: string): string {
  return value.replace(/^([VEJGP])[- ]?/i, '$1-')
}
