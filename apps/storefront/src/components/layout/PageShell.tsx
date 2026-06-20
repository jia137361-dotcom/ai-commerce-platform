import type { ReactNode } from "react"

type PageShellProps = {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  sidebar?: ReactNode
  className?: string
  contentClassName?: string
}

export function PageShell({ children, header, footer, sidebar, className = "", contentClassName = "" }: PageShellProps) {
  return (
    <div className={["buyer-ui-page-shell", className].filter(Boolean).join(" ")}>
      {header}
      <div className={["buyer-ui-page-shell-content", sidebar ? "has-sidebar" : "", contentClassName].filter(Boolean).join(" ")}>
        {sidebar ? <aside className="buyer-ui-page-shell-sidebar">{sidebar}</aside> : null}
        <main className="buyer-ui-page-shell-main">{children}</main>
      </div>
      {footer}
    </div>
  )
}
