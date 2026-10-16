import type { CustomerHistoryEvent } from '../../types.ts'
import {
  formatDate,
  formatDateTime,
  formatInvoiceNumber,
  formatPeriod,
} from '../../lib/format.ts'

export function CustomerHistory({
  events,
}: {
  events: CustomerHistoryEvent[]
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Historial</h2>
      </div>
      {events.length ? (
        <ol className="customer-history">
          {events.map((event) => (
            <li className="customer-history-event" key={event.id}>
              <time dateTime={event.occurredAt}>
                {formatDateTime(event.occurredAt)}
              </time>
              <div>
                <strong>
                  {event.type === 'CUSTOMER_CREATED'
                    ? 'Cliente creado'
                    : event.type === 'INVOICE_IMPORTED'
                      ? 'Factura importada'
                      : 'Pagada en el ISP'}
                  {event.invoiceId !== null &&
                    ` · ${formatInvoiceNumber(event.invoiceId)}`}
                </strong>
                <p>{describeEvent(event)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted customer-history-empty">
          Todavía no hay eventos registrados.
        </p>
      )}
    </section>
  )
}

function describeEvent(event: CustomerHistoryEvent): string {
  if (event.type === 'CUSTOMER_CREATED')
    return `Cliente creado desde el contrato ${event.externalContractId ?? '—'} del administrador.`
  if (event.type === 'INVOICE_IMPORTED')
    return `Cuota ${event.externalInstallmentId ?? '—'} · ${event.plan ?? ''}${event.plan && event.period ? ' - ' : ''}${event.period ? formatPeriod(event.period) : ''}`
  if (!event.payerInvoiceIds.length)
    return 'Pago confirmado en el administrador de facturas.'
  return `Pagada en el administrador (factura${event.payerInvoiceIds.length > 1 ? 's' : ''} ${event.payerInvoiceIds.join(', ')} del ${formatDate(event.occurredAt)}).`
}
