import { InvalidValueError } from '../../../shared/domain/domain-error.ts'
import type { IspConnectionTester } from '../ports/isp-connection.ts'
import type { SettingsRepository } from '../ports/settings-repository.ts'

export class TestIspConnectionUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly ispConnection: IspConnectionTester
  ) {}

  async execute(): Promise<number> {
    const settings = this.settingsRepository.get()

    if (!settings) {
      throw new InvalidValueError('La configuración no está inicializada.')
    }

    return this.ispConnection.test(settings.isp)
  }
}
