import { useEffect, useState } from 'react'

import { api } from '../lib/api.ts'

export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    api<T>(url, { signal: controller.signal })
      .then(setData)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudieron cargar los datos.'
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [url, version])

  return {
    data,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
  }
}
