export function StatusPill({ value }: { value: string }) {
  const style =
    value === 'COMPLETED' || value === 'PAID' || value === 'ACTIVO'
      ? 'pill-green'
      : value === 'FAILED' || value === 'ANULADO' || value === 'CORTADO'
        ? 'pill-red'
        : value === 'RUNNING' || value === 'OPEN'
          ? 'pill-amber'
          : 'pill-neutral'
  return (
    <span className={`status-pill ${style}`}>
      {value === 'COMPLETED'
        ? 'Completada'
        : value === 'FAILED'
          ? 'Fallida'
          : value === 'RUNNING'
            ? 'En curso'
            : value === 'PAID'
              ? 'Pagada'
              : value === 'OPEN'
                ? 'Abierta'
                : value}
    </span>
  )
}
