import { describe, expect, it } from 'vitest'

import {
  IspClient,
  IspError,
} from '../src/modules/shared/infrastructure/isp-client.ts'

describe('cliente HTTP del ISP', () => {
  it('usa HTTP bearer y conserva el token entre consultas', async () => {
    let loginCount = 0
    let requestCount = 0
    const fetchStub: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.endsWith('/usuario/login')) {
        loginCount++
        return jsonResponse({
          access_token: 'test-token',
          access_token_expires_in: new Date(
            Date.now() + 60 * 60_000
          ).toISOString(),
        })
      }
      requestCount++
      expect(new Headers(init?.headers).get('authorization')).toBe(
        'Bearer test-token'
      )
      return jsonResponse({ data: [900101], success: true })
    }
    const client = new IspClient(
      {
        baseUrl: 'http://isp.local/api/v1',
        username: 'user',
        password: 'private',
      },
      1000,
      fetchStub
    )

    await expect(client.listContractIds()).resolves.toEqual([900101])
    await expect(client.listContractIds()).resolves.toEqual([900101])
    expect(loginCount).toBe(1)
    expect(requestCount).toBe(2)
  })

  it('renueva y reintenta una lectura una sola vez ante HTTP 401', async () => {
    let loginCount = 0
    let queryCount = 0
    const fetchStub: typeof fetch = async (input) => {
      if (String(input).endsWith('/usuario/login')) {
        loginCount++
        return jsonResponse({
          access_token: `token-${loginCount}`,
          access_token_expires_in: new Date(
            Date.now() + 60 * 60_000
          ).toISOString(),
        })
      }
      queryCount++
      return queryCount === 1
        ? jsonResponse({ detail: 'Token expirado' }, 401)
        : jsonResponse({ data: [900102] })
    }
    const client = new IspClient(
      { baseUrl: 'http://isp.local', username: 'user', password: 'private' },
      1000,
      fetchStub
    )

    await expect(client.listContractIds()).resolves.toEqual([900102])
    expect(loginCount).toBe(2)
    expect(queryCount).toBe(2)
  })

  it('rechaza respuestas mal formadas y no devuelve una contraseña reflejada por el proveedor', async () => {
    const malformed = new IspClient(
      { baseUrl: 'http://isp.local', username: 'user', password: 'private' },
      1000,
      async () => jsonResponse({ access_token: 'token' })
    )
    await expect(malformed.listContractIds()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })

    const rejected = new IspClient(
      { baseUrl: 'http://isp.local', username: 'user', password: 'private' },
      1000,
      async () =>
        jsonResponse({ detail: { mensaje: 'password private rejected' } }, 400)
    )
    let thrown: unknown
    try {
      await rejected.listContractIds()
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(IspError)
    expect(thrown instanceof Error ? thrown.message : '').toBe(
      'password [redactado] rejected'
    )
  })
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
