import { InvalidValueError } from '../../../shared/domain/domain-error.ts'
import type { SettingsRepository } from '../ports/settings-repository.ts'

export class GetSettingsUseCase {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  execute() {
    const settings = this.settingsRepository.get()

    if (!settings) {
      throw new InvalidValueError('La configuración no está inicializada.')
    }

    return settings
  }
}
