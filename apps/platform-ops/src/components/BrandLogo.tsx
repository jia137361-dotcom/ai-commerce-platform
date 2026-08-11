import { Link } from "react-router-dom"
import { cn } from "../lib/cn"

export function BrandLogo({
  subtitle,
  className,
  to = "/dashboard",
}: {
  subtitle?: string
  className?: string
  to?: string
}) {
  return (
    <Link to={to} className={cn("inline-block", className)}>
      <span className="text-2xl font-bold tracking-tight">
        <span className="text-brand">Cii</span>
        <span className="text-slate-900">Verse</span>
      </span>
      {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
    </Link>
  )
}
