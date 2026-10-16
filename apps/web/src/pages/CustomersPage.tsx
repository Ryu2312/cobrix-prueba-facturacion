import { useState } from 'react'
import { Link } from 'react-router'

import type { Customer } from '../types.ts'
import { formatDate, formatMoney } from '../lib/format.ts'
import { useResource } from '../hooks/useResource.ts'
import { Empty } from '../components/ui/Empty.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const query = new URLSearchParams()
  if (search.trim()) query.set('q', search.trim())
  const { data, loading, error, refresh } = useResource<Customer[]>(
    `/api/customers${query.size ? `?${query}` : ''}`
  )
  return (
    <>
      <PageHeading
        eyebrow="CARTERA"
        title="Clientes"
        description="Titulares importados desde el proveedor y su saldo actual."
      />
      <section className="panel">
        <div className="table-toolbar">
          <div>
            <h2>Directorio</h2>
            <span className="muted">{data?.length ?? 0} registros</span>
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              aria-label="Buscar cliente"
              placeholder="Nombre, cédula o RIF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <Notice loading={loading} error={error} retry={refresh} />
        {data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CLIENTE</th>
                  <th>DOCUMENTO</th>
                  <th className="center">TIPO</th>
                  <th>CONTRATOS</th>
                  <th className="center">FACTURAS</th>
                  <th>DEUDA</th>
                  <th>VENCE DESDE</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        className="customer-link"
                        to={`/customers/${encodeURIComponent(customer.id)}`}
                      >
                        {customer.name}
                      </Link>
                      <small>{customer.email || 'Sin correo registrado'}</small>
                    </td>
                    <td className="mono">{customer.id}</td>
                    <td>
                      {customer.documentType === 'juridical'
                        ? 'Jurídico'
                        : 'Natural'}
                    </td>
                    <td className="center">{customer.contracts}</td>
                    <td>
                      {customer.openInvoices} abiertas{' '}
                      <span className="subtle">
                        · {customer.paidInvoices} pagadas
                      </span>
                    </td>
                    <td className="amount">
                      {formatMoney(customer.amountDue)}
                    </td>
                    <td>{formatDate(customer.oldestDueAt)}</td>
                    <td>
                      <Link
                        className="row-link"
                        to={`/customers/${encodeURIComponent(customer.id)}`}
                        aria-label={`Ver ${customer.name}`}
                      >
                        ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !loading &&
          !error && (
            <Empty
              title="No hay clientes para mostrar"
              text={
                search
                  ? 'Prueba con otro nombre o documento.'
                  : 'Importa los clientes del proveedor desde Sincronización.'
              }
              action={
                !search && (
                  <Link className="button button-secondary" to="/sync">
                    Ir a sincronización
                  </Link>
                )
              }
            />
          )
        )}
      </section>
    </>
  )
}
