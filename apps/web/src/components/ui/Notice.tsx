export function Notice({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: string | null
  retry: () => void
}) {
  if (loading)
    return (
      <div className="loading-line">
        <span className="spinner" />
        Cargando información…
      </div>
    )
  if (error)
    return (
      <div className="notice notice-error" role="alert">
        <span>{error}</span>
        <button className="text-link" onClick={retry}>
          Reintentar
        </button>
      </div>
    )
  return null
}
