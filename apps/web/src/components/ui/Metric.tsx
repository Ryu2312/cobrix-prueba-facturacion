import type { ReactNode } from 'react'

export function Metric({
  label,
  value,
  detail,
  icon,
  tone = '',
}: {
  label: string
  value: ReactNode
  detail: string
  icon: string
  tone?: string
}) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}
