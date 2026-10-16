import type { FastifyInstance } from 'fastify'

import type { GetDashboardSummaryUseCase } from '../application/use-cases/get-dashboard-summary.ts'

export class DashboardRoutes {
  constructor(
    private readonly getDashboardSummary: GetDashboardSummaryUseCase
  ) {}

  register(app: FastifyInstance): void {
    app.get('/api/summary', async () => this.getDashboardSummary.execute())
  }
}
