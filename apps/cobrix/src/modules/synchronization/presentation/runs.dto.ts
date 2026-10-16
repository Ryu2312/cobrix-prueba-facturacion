import type { RunDetails, RunSummary } from '../application/run-summary.ts'

export interface RunResponseDto {
  readonly id: number
  readonly kind: 'IMPORT' | 'RECONCILE'
  readonly simulation: boolean
  readonly status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  readonly summary: unknown
  readonly error: string | null
  readonly startedAt: string
  readonly finishedAt: string | null
}

export interface RunDetailsResponseDto extends RunResponseDto {
  readonly items: readonly {
    readonly id: number
    readonly runId: number
    readonly externalContractId: number | null
    readonly externalInstallmentId: string | null
    readonly customerId: string | null
    readonly period: string | null
    readonly outcome: string
    readonly reason: string
    readonly amount: number | null
    readonly details: unknown
  }[]
}

export function toRunResponseDto(run: RunSummary): RunResponseDto {
  return {
    id: run.id,
    kind: run.kind,
    simulation: run.simulation,
    status: run.status,
    summary: run.summary,
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}

export function toRunDetailsResponseDto(
  run: RunDetails
): RunDetailsResponseDto {
  return {
    ...toRunResponseDto(run),
    items: run.items.map((item) => ({ ...item })),
  }
}
