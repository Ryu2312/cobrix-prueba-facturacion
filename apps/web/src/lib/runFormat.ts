import type { JsonObject } from '../types.ts'
import { isObject } from './guards.ts'

export function summaryText(value: JsonObject): string {
  const counts = isObject(value.items) ? value.items : {}
  return (
    Object.entries(counts)
      .slice(0, 3)
      .map(([key, count]) => `${humanOutcome(key)}: ${String(count)}`)
      .join(' · ') || 'Sin resultados'
  )
}

export function humanOutcome(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}
