import type { ReactNode } from 'react'

export function Empty({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-mark">○</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
