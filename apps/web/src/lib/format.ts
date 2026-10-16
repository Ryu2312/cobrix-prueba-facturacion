export function formatMoney(value: unknown): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(value: unknown): string {
  return new Intl.NumberFormat('es-VE').format(
    typeof value === 'number' ? value : 0
  )
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(date)
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('es-VE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export function formatPeriod(value: string): string {
  const date = new Date(`${value}-01T00:00:00`)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('es-VE', {
        month: 'short',
        year: 'numeric',
      }).format(date)
}

export function formatInvoiceNumber(id: number): string {
  return `FAC-${String(id).padStart(6, '0')}`
}
