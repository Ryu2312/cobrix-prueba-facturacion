import type { RunDetails, RunSummary } from '../run-summary.ts'

export interface RunHistoryRepository {
  list(): readonly RunSummary[]
  getById(id: number): RunDetails | null
}
