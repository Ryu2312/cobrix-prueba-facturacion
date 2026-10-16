import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'

export type CobrixDatabase = ReturnType<typeof drizzle>

export interface OpenDatabaseOptions {
  readonly path?: string
  readonly migrationsFolder?: string
}

export function defaultDatabasePath(): string {
  return (
    process.env.COBRIX_DB_PATH ??
    resolve(process.cwd(), '../../data/cobrix.sqlite')
  )
}

export function defaultMigrationsFolder(): string {
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../drizzle/migrations'
  )
}

export function openDatabase(options: OpenDatabaseOptions = {}): {
  readonly client: DatabaseSync
  readonly db: CobrixDatabase
  close(): void
} {
  const path = options.path ?? defaultDatabasePath()
  mkdirSync(dirname(resolve(path)), { recursive: true })
  const client = new DatabaseSync(path)
  client.exec(
    'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;'
  )
  const db = drizzle({ client })
  migrate(db, {
    migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder(),
  })
  return { client, db, close: () => client.close() }
}
