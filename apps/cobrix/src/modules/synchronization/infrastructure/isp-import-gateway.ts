import { IspClient } from '../../shared/infrastructure/isp-client.ts'
import type { IspGatewayFactory } from '../application/ports/isp-gateway.ts'

export class HttpImportIspGatewayFactory implements IspGatewayFactory {
  create(credentials: {
    readonly baseUrl: string
    readonly username: string
    readonly password: string
  }): IspClient {
    return new IspClient(credentials)
  }
}
