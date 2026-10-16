const TIME_ZONE = 'America/Caracas'

export function today(): string {
  const pinned = process.env.SANDBOX_TODAY
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) return pinned
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addCivilDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function addMonths(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number) as [number, number]
  const index = year * 12 + month - 1 + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
