import { useEffect, useState, type FormEvent } from 'react'

import { api } from '../lib/api.ts'
import type { Settings } from '../types.ts'

export function useSettingsForm(data: Settings | null, refresh: () => void) {
  const [draft, setDraft] = useState<Settings | null>(null)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)
  const [connection, setConnection] = useState<string | null>(null)

  useEffect(() => {
    if (data) setDraft(data)
  }, [data])

  function updateCompany(key: keyof Settings['company'], value: string) {
    setDraft((current) =>
      current
        ? { ...current, company: { ...current.company, [key]: value } }
        : current
    )
  }

  function updateProvider(key: 'baseUrl' | 'username', value: string) {
    setDraft((current) =>
      current
        ? { ...current, provider: { ...current.provider, [key]: value } }
        : current
    )
  }

  function updateSync<K extends keyof Settings['sync']>(
    key: K,
    value: Settings['sync'][K]
  ) {
    setDraft((current) =>
      current
        ? { ...current, sync: { ...current.sync, [key]: value } }
        : current
    )
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return

    setBusy(true)
    setMessage('')
    setFailure('')
    try {
      await api<{ ok: boolean }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          company: draft.company,
          provider: {
            baseUrl: draft.provider.baseUrl,
            username: draft.provider.username,
            password,
          },
          sync: draft.sync,
        }),
      })
      setPassword('')
      setMessage('Configuración guardada.')
      refresh()
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar la configuración.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function testConnection() {
    setConnection(null)
    try {
      const result = await api<{ contractCount: number }>(
        '/api/provider/test',
        { method: 'POST' }
      )
      setConnection(
        `Conexión correcta: ${result.contractCount} contratos disponibles.`
      )
    } catch (cause) {
      setConnection(
        cause instanceof Error
          ? cause.message
          : 'No fue posible conectar con el ISP.'
      )
    }
  }

  return {
    draft,
    password,
    setPassword,
    message,
    failure,
    busy,
    connection,
    updateCompany,
    updateProvider,
    updateSync,
    save,
    testConnection,
  }
}
