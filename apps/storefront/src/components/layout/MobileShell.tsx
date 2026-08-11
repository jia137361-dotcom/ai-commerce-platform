import type { ReactNode } from "react"

type MobileShellProps = {
  children: ReactNode
  title?: string
  backHref?: string
  actions?: ReactNode
  footer?: ReactNode
  className?: string
}

export function MobileShell({ children, title, backHref, actions, footer, className = "" }: MobileShellProps) {
  return (
    <div className={["buyer-ui-mobile-shell", className].filter(Boolean).join(" ")}>
      {title || backHref || actions ? (
        <header className="buyer-ui-mobile-shell-header">
          {backHref ? <a href={backHref} aria-label="Go back">‹</a> : <span />}
          {title ? <strong>{title}</strong> : <span />}
          <div>{actions}</div>
        </header>
      ) : null}
      <main>{children}</main>
      {footer ? <footer className="buyer-ui-mobile-shell-footer">{footer}</footer> : null}
    </div>
  )
}
