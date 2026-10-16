import type { IspConnection as IspSettings } from '../../domain/isp-connection.ts'

export interface IspConnectionTester {
  test(settings: IspSettings): Promise<number>
}
