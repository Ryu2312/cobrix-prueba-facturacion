import { InvalidValueError } from '../../shared/domain/domain-error.ts'

export interface IspConnectionProps {
  baseUrl: string
  username: string
  password: string
}

export class IspConnection {
  private constructor(
    readonly baseUrl: string,
    readonly username: string,
    readonly password: string
  ) {}

  static create(input: IspConnectionProps): IspConnection {
    const baseUrl = input.baseUrl.trim().replace(/\/+$/, '')
    const username = input.username.trim()

    try {
      const url: URL = new URL(baseUrl)

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        throw new InvalidValueError(
          'La URL del ISP debe ser absoluta y no incluir credenciales, consulta ni fragmento.'
        )
      }

      if (!username || !input.password) {
        throw new InvalidValueError(
          'El usuario y la contraseña del ISP son obligatorios.'
        )
      }

      return new IspConnection(
        url.toString().replace(/\/$/, ''),
        username,
        input.password
      )
    } catch {
      throw new InvalidValueError('La URL del ISP no es válida.')
    }
  }
}
