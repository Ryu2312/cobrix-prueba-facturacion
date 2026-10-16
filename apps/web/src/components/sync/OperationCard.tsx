export function OperationCard({
  number,
  title,
  text,
  onSimulate,
  onRun,
  busy,
  actionLabel = 'Ejecutar',
}: {
  number: string
  title: string
  text: string
  onSimulate: () => void
  onRun: () => void
  busy: boolean
  actionLabel?: string
}) {
  return (
    <section className="panel operation-card">
      <div className="operation-top">
        <span className="operation-number">{number}</span>
        <span className="operation-icon">↻</span>
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="operation-actions">
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={onSimulate}
        >
          Vista previa
        </button>
        <button
          className="button button-primary"
          disabled={busy}
          onClick={onRun}
        >
          {busy ? 'Procesando…' : actionLabel}
        </button>
      </div>
    </section>
  )
}
