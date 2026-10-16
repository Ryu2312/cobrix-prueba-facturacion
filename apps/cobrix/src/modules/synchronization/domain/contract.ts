export const IMPORTABLE_STATUSES = ['ACTIVO', 'CORTADO'] as const

export interface ContractSnapshot {
  readonly contractId: number
  readonly code: string
  readonly status: string
  readonly identity: string
  readonly name: string
  readonly email: string
  readonly phone: string
  readonly address: string
  readonly plan: string
  readonly price: number
  readonly currency: string
  readonly branch: string
}

export function contractIsImportable(
  contract: ContractSnapshot,
  allowedStatuses: readonly string[]
): boolean {
  return allowedStatuses.includes(contract.status)
}

export function isUsdCoherent(
  currency: string,
  planPrice: number,
  debt: number
): boolean {
  if (currency !== 'USD') return false
  if (!Number.isFinite(planPrice) || planPrice <= 0) return false
  return Number.isFinite(debt) && debt >= planPrice * 0.01
}
