export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <span className="state-spinner" />
      <strong>{label}</strong>
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string
  message?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="state-box error-state" role="alert">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="state-box empty-state">
      <div className="empty-illustration">0</div>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action && <a className="primary-button" href={action.href}>{action.label}</a>}
    </div>
  )
}
