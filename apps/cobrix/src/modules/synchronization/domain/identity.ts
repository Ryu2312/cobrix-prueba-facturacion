export interface NormalizedIdentity {
  readonly id: string
  readonly documentType: 'V' | 'E' | 'J' | 'G' | 'P'
  readonly legalEntity: boolean
}

const PREFIXES = new Set(['V', 'E', 'J', 'G', 'P'])

export function normalizeIdentity(value: unknown): NormalizedIdentity | null {
  if (typeof value !== 'string') return null
  const compact = value
    .trim()
    .toUpperCase()
    .replaceAll(/[\s.-]/g, '')
  const prefix = isDocumentType(compact[0]) ? compact[0] : null
  const rawDigits = prefix ? compact.slice(1) : compact
  if (!/^\d{6,12}$/.test(rawDigits)) return null

  const digits = rawDigits.replace(/^0+/, '')
  if (digits.length < 6 || digits.length > 12) return null

  return {
    id: `${prefix ?? ''}${digits}`,
    documentType: prefix ?? 'V',
    legalEntity: prefix === 'J' || prefix === 'G',
  }

  function isDocumentType(
    value: string | undefined
  ): value is NormalizedIdentity['documentType'] {
    return value !== undefined && PREFIXES.has(value)
  }
}
