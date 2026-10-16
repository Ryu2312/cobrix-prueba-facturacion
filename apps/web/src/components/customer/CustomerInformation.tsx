import type { CustomerDetail } from '../../types.ts'
import { formatDateTime } from '../../lib/format.ts'

export function CustomerInformation({
  customer,
}: {
  customer: CustomerDetail
}) {
  return (
    <section className="panel customer-information">
      <div className="panel-heading">
        <h2>Datos del cliente</h2>
      </div>
      <dl className="customer-data-list">
        <div>
          <dt>ID externo</dt>
          <dd>{customer.id}</dd>
        </div>
        <div>
          <dt>Documento</dt>
          <dd>{formatDocument(customer.id)}</dd>
        </div>
        <div>
          <dt>Correo</dt>
          <dd>{customer.email || 'No registrado'}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{customer.phone || 'No registrado'}</dd>
        </div>
        <div>
          <dt>Dirección</dt>
          <dd>{customer.address || 'No registrada'}</dd>
        </div>
        <div>
          <dt>Origen</dt>
          <dd>
            {customer.origin === 'ISP'
              ? 'Administrador de facturas (ISP)'
              : customer.origin}
          </dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{formatDateTime(customer.createdAt)}</dd>
        </div>
      </dl>
    </section>
  )
}

function formatDocument(value: string): string {
  return value.replace(/^([VEJGP])[- ]?/i, '$1-')
}
