import { eq } from 'drizzle-orm'

import type { SettingsRepository } from '../application/ports/settings-repository.ts'
import type { CobrixDatabase } from '../../shared/infrastructure/database.ts'
import {
  company,
  provider,
  syncSettings,
} from '../../../../drizzle/schema.drizzle.ts'
import { Settings } from '../domain/settings.ts'
import { SettingsMapper } from './settings-mapper.ts'

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: CobrixDatabase) {}

  get(): Settings | null {
    const companyRow = this.db
      .select()
      .from(company)
      .where(eq(company.id, 1))
      .get()

    const providerRow = this.db
      .select()
      .from(provider)
      .where(eq(provider.id, 1))
      .get()

    const syncRow = this.db
      .select()
      .from(syncSettings)
      .where(eq(syncSettings.id, 1))
      .get()

    if (!companyRow && !providerRow && !syncRow) {
      return null
    }

    if (!companyRow || !providerRow || !syncRow) {
      throw new Error('La configuración almacenada está incompleta.')
    }

    return SettingsMapper.toDomain({ companyRow, providerRow, syncRow })
  }

  create(settings: Settings): void {
    const input = SettingsMapper.toPersistence(settings)

    this.db.transaction((tx) => {
      tx.insert(company)
        .values({ id: 1, ...input.company })
        .run()
      tx.insert(provider)
        .values({ id: 1, ...input.provider })
        .run()
      tx.insert(syncSettings)
        .values({ id: 1, ...input.sync })
        .run()
    })
  }

  save(settings: Settings): void {
    const input = SettingsMapper.toPersistence(settings)

    this.db.transaction((tx) => {
      const companyResult = tx
        .update(company)
        .set(input.company)
        .where(eq(company.id, 1))
        .run()

      const providerResult = tx
        .update(provider)
        .set(input.provider)
        .where(eq(provider.id, 1))
        .run()

      const syncResult = tx
        .update(syncSettings)
        .set(input.sync)
        .where(eq(syncSettings.id, 1))
        .run()

      if (
        companyResult.changes !== 1 ||
        providerResult.changes !== 1 ||
        syncResult.changes !== 1
      ) {
        throw new Error('No se pudo actualizar la configuración completa.')
      }
    })
  }
}
