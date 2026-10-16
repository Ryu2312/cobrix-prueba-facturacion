import { Link } from 'react-router'

import type { Invoice } from '../../types.ts'
import {
  formatDate,
  formatInvoiceNumber,
  formatMoney,
  formatPeriod,
} from '../../lib/format.ts'
import { StatusPill } from '../ui/StatusPill.tsx'

export function InvoiceTable({
  invoices,
  variant = 'directory',
}: {
  invoices: Invoice[]
  variant?: 'directory' | 'customer'
}) {
  const customerView = variant === 'customer'

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>FACTURA</th>
            {!customerView && <th>CLIENTE</th>}
            <th>{customerView ? 'CUOTA EN EL ADMINISTRADOR' : 'CUOTA ISP'}</th>
            <th>PERÍODO</th>
            {customerView && <th>DESCRIPCIÓN</th>}
            <th>{customerView ? 'VENCE' : 'VENCIMIENTO'}</th>
            <th>CORTE</th>
            <th>TOTAL</th>
            <th>SALDO</th>
            <th>ESTADO</th>
            {!customerView && <th>FECHA DE PAGO</th>}
            {!customerView && <th>FACTURA ISP</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="mono">{formatInvoiceNumber(invoice.id)}</td>
              {!customerView && (
                <td>
                  <Link
                    className="customer-link"
                    to={`/customers/${encodeURIComponent(invoice.customerId)}`}
                  >
                    {invoice.customerName}
                  </Link>
                  <small>Contrato {invoice.contractCode}</small>
                </td>
              )}
              <td className="mono">
                {invoice.externalInstallmentId}
                {customerView && (
                  <small>contrato {invoice.externalContractId}</small>
                )}
              </td>
              <td>{formatPeriod(invoice.period)}</td>
              {customerView && (
                <td>
                  {invoice.plan} - {formatPeriod(invoice.period)}
                </td>
              )}
              <td>{formatDate(invoice.dueAt)}</td>
              <td>{formatDate(invoice.cutAt)}</td>
              <td>{formatMoney(invoice.total)}</td>
              <td className="amount">{formatMoney(invoice.balance)}</td>
              <td>
                <StatusPill value={invoice.status} />
                {customerView && invoice.paidAt && (
                  <small>{formatDate(invoice.paidAt)}</small>
                )}
              </td>
              {!customerView && <td>{formatDate(invoice.paidAt)}</td>}
              {!customerView && (
                <td className="mono">{invoice.payerInvoiceId ?? '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
