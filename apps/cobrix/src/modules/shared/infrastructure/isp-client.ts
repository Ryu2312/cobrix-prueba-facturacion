export interface IspCredentials {
  readonly baseUrl: string
  readonly username: string
  readonly password: string
}

interface CachedToken {
  readonly value: string
  readonly expiresAt: number
}

export class IspError extends Error {
  readonly statusCode?: number
  readonly code: string

  constructor(message: string, statusCode?: number, code = 'ISP_ERROR') {
    super(message)
    this.name = 'IspError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class IspClient {
  private token: CachedToken | null = null

  constructor(
    credentials: IspCredentials,
    timeoutMs = 10_000,
    fetchImpl: typeof fetch = fetch
  ) {
    this.credentials = credentials
    this.timeoutMs = timeoutMs
    this.fetchImpl = fetchImpl
  }

  private readonly credentials: IspCredentials
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch

  async testConnection(): Promise<number> {
    const ids = await this.listContractIds()
    return ids.length
  }

  async listContractIds(): Promise<number[]> {
    const body = await this.get('/isp/lista_ids_contratos')
    if (!isRecord(body) || !Array.isArray(body.data))
      throw new IspError(
        'La API devolvió una lista de contratos inválida.',
        undefined,
        'INVALID_RESPONSE'
      )
    const ids: number[] = []
    for (const id of body.data as unknown[]) {
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
        throw new IspError(
          'La API devolvió identificadores de contrato inválidos.',
          undefined,
          'INVALID_RESPONSE'
        )
      ids.push(id)
    }
    if (new Set(ids).size !== ids.length)
      throw new IspError(
        'La API repitió identificadores de contrato.',
        undefined,
        'INVALID_RESPONSE'
      )
    return ids
  }

  async getContractRows(contractId: number): Promise<unknown[]> {
    const query = new URLSearchParams({ id_contrato: String(contractId) })
    const rows = await this.get(`/isp/contrato/individual?${query}`)
    if (!Array.isArray(rows))
      throw new IspError(
        'La API devolvió cuotas con un formato inesperado.',
        undefined,
        'INVALID_RESPONSE'
      )
    return rows
  }

  async getPaymentRows(
    contractId: number,
    startDate: string,
    endDate: string
  ): Promise<unknown[]> {
    const query = new URLSearchParams({
      id_contrato: String(contractId),
      tipo_busqueda: 'CUOTA',
      fecha_inicio: startDate,
      fecha_fin: endDate,
    })
    const body = await this.get(`/isp/pago_informacion?${query}`)
    if (!isRecord(body) || !Array.isArray(body.data))
      throw new IspError(
        'La API devolvió el libro de pagos con un formato inesperado.',
        undefined,
        'INVALID_RESPONSE'
      )
    return body.data as unknown[]
  }

  private async get(path: string): Promise<unknown> {
    try {
      await this.ensureToken()
      const response = await this.request(path, {
        method: 'GET',
        headers: { authorization: `Bearer ${this.token!.value}` },
      })
      if (response.status === 401) {
        this.token = null
        await this.ensureToken()
        return await this.readResponse(
          await this.request(path, {
            method: 'GET',
            headers: { authorization: `Bearer ${this.token!.value}` },
          })
        )
      }
      return await this.readResponse(response)
    } catch (error) {
      if (error instanceof IspError) throw error
      if (error instanceof DOMException && error.name === 'TimeoutError')
        throw new IspError(
          'El administrador del ISP no respondió dentro del tiempo permitido.',
          undefined,
          'ISP_TIMEOUT'
        )
      throw new IspError(
        'No se pudo conectar con el administrador del ISP.',
        undefined,
        'ISP_UNAVAILABLE'
      )
    }
  }

  private async ensureToken(): Promise<void> {
    if (this.token && Date.now() < this.token.expiresAt - 30_000) return

    const response = await this.request('/usuario/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_name: this.credentials.username,
        password: this.credentials.password,
      }),
    })
    const body = await this.readResponse(response)
    if (
      !isRecord(body) ||
      typeof body.access_token !== 'string' ||
      typeof body.access_token_expires_in !== 'string'
    )
      throw new IspError(
        'El inicio de sesión del ISP devolvió una respuesta inválida.',
        undefined,
        'INVALID_RESPONSE'
      )

    const expiry = parseExpiry(body.access_token_expires_in)
    if (!expiry || expiry <= Date.now())
      throw new IspError(
        'El ISP devolvió un vencimiento de token inválido.',
        undefined,
        'INVALID_RESPONSE'
      )
    this.token = { value: body.access_token, expiresAt: expiry }
  }

  private request(path: string, init: RequestInit): Promise<Response> {
    const base = this.credentials.baseUrl
      .replace(/\/+$/, '')
      .replace(/\/api\/v1$/i, '')
    let url: URL
    try {
      url = new URL(`${base}/api/v1${path.startsWith('/') ? path : `/${path}`}`)
    } catch {
      throw new IspError(
        'La URL configurada para el ISP no es válida.',
        undefined,
        'INVALID_CONFIGURATION'
      )
    }
    return this.fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs),
    })
  }

  private async readResponse(response: Response): Promise<unknown> {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new IspError(
        `El ISP respondió con HTTP ${response.status} y un cuerpo inválido.`,
        response.status,
        'INVALID_RESPONSE'
      )
    }
    if (!response.ok) {
      const message =
        extractErrorMessage(body)?.replaceAll(
          this.credentials.password,
          '[redactado]'
        ) ?? `El ISP respondió con HTTP ${response.status}.`
      throw new IspError(
        message,
        response.status,
        response.status === 401 ? 'ISP_UNAUTHORIZED' : 'ISP_HTTP_ERROR'
      )
    }
    return body
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseExpiry(value: string): number | null {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  const epoch = Date.parse(normalized)
  return Number.isFinite(epoch) ? epoch : null
}

function extractErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) return null
  const detail = value.detail
  if (typeof detail === 'string') return detail.slice(0, 300)
  if (isRecord(detail) && typeof detail.mensaje === 'string')
    return detail.mensaje.slice(0, 300)
  return null
}
