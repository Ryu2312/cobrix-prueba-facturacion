import { addCivilDays } from './time.ts'

const MONTHS = new Map<string, string>([
  ['enero', '01'],
  ['febrero', '02'],
  ['marzo', '03'],
  ['abril', '04'],
  ['mayo', '05'],
  ['junio', '06'],
  ['julio', '07'],
  ['agosto', '08'],
  ['septiembre', '09'],
  ['setiembre', '09'],
  ['octubre', '10'],
  ['noviembre', '11'],
  ['diciembre', '12'],
])

export function parsePeriod(details: unknown): string | null {
  if (
    !Array.isArray(details) ||
    details.some((part) => typeof part !== 'string')
  )
    return null

  const matches = details.flatMap((part) => {
    const match = /(?:^|\D)((?:19|20)\d{2})\s+([a-záéíóúñ]+)/i.exec(part)
    if (!match) return []
    const month = MONTHS.get(
      match[2]!
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
    )
    return month ? [`${match[1]}-${month}`] : []
  })

  return matches.length === 1 ? matches[0]! : null
}

export function periodDueDate(period: string): string {
  return `${period}-01`
}

export function cutDate(dueAt: string, graceDays: number): string {
  return addCivilDays(dueAt, graceDays)
}
