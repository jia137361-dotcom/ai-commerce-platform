import type { ReactNode } from "react"

type SectionHeaderProps = {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  level?: 1 | 2 | 3
  className?: string
}

export function SectionHeader({ title, eyebrow, description, actions, level = 2, className = "" }: SectionHeaderProps) {
  const Heading = `h${level}` as "h1" | "h2" | "h3"
  return (
    <header className={["buyer-ui-section-header", className].filter(Boolean).join(" ")}>
      <div>
        {eyebrow ? <p className="buyer-ui-eyebrow">{eyebrow}</p> : null}
        <Heading>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="buyer-ui-section-actions">{actions}</div> : null}
    </header>
  )
}
