import { IspClient } from '../../shared/infrastructure/isp-client.ts'
import type { IspConnectionTester } from '../application/ports/isp-connection.ts'
import type { IspConnection as IspSettings } from '../domain/isp-connection.ts'

export class HttpIspConnection implements IspConnectionTester {
  async test(settings: IspSettings): Promise<number> {
    return new IspClient({
      baseUrl: settings.baseUrl,
      username: settings.username,
      password: settings.password,
    }).testConnection()
  }
}
