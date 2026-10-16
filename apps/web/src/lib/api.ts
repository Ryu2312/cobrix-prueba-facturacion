import { isObject } from './guards.ts'

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      isObject(body) && typeof body.message === 'string'
        ? body.message
        : `La solicitud falló (HTTP ${response.status}).`
    throw new Error(message)
  }
  return body as T
}
