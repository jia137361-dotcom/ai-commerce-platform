import { Link } from "react-router-dom"
import { cn } from "../lib/cn"

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-2 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}

export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand"
    >
      {children}
    </Link>
  )
}

export function DetailHeader({ backTo, backLabel, title }: { backTo: string; backLabel: string; title: string }) {
  return (
    <div className="mb-8">
      <BackLink to={backTo}>{backLabel}</BackLink>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
    </div>
  )
}
