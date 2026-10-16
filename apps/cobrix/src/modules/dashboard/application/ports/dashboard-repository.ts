import type { DashboardSummary } from '../dashboard-summary.ts'

export interface DashboardRepository {
  getSummary(): DashboardSummary
}
