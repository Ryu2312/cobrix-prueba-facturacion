import type { Settings } from '../../domain/settings.ts'

export interface SettingsRepository {
  get(): Settings | null
  create(settings: Settings): void
  save(settings: Settings): void
}
