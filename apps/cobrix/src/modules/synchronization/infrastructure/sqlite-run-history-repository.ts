import { eq, sql } from 'drizzle-orm'

import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import { runItems, runs } from '../../../../drizzle/schema.drizzle.ts'
import type { RunHistoryRepository } from '../application/ports/run-history-repository.ts'
import type { RunDetails, RunSummary } from '../application/run-summary.ts'

export class SqliteRunHistoryRepository implements RunHistoryRepository {
  constructor(private readonly db: CobrixDatabase) {}

  list(): readonly RunSummary[] {
    return this.db
      .select()
      .from(runs)
      .orderBy(sql`${runs.startedAt} desc`)
      .limit(100)
      .all()
      .map(serializeRun)
  }

  getById(id: number): RunDetails | null {
    const run = this.db.select().from(runs).where(eq(runs.id, id)).get()
    if (!run) return null
    const items = this.db
      .select()
      .from(runItems)
      .where(eq(runItems.runId, id))
      .orderBy(runItems.id)
      .all()
      .map((item) => ({ ...item, details: parseJson(item.details) }))
    return { ...serializeRun(run), items }
  }
}

function serializeRun(run: typeof runs.$inferSelect): RunSummary {
  return {
    id: run.id,
    kind: run.kind,
    simulation: run.simulation,
    status: run.status,
    summary: parseJson(run.summary),
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return { invalidStoredJson: true }
  }
}
