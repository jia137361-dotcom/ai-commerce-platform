import { cn } from "../../lib/cn"

const VARIANTS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  published: "bg-emerald-50 text-emerald-700",
  paid: "bg-emerald-50 text-emerald-700",
  delivered: "bg-emerald-50 text-emerald-700",
  disabled: "bg-red-50 text-red-600",
  suspended: "bg-red-50 text-red-600",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
  unknown: "bg-slate-100 text-slate-600",
}

export function Badge({ label, className }: { label: string; className?: string }) {
  const key = label.toLowerCase().replace(/\s+/g, "_")
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        VARIANTS[key] ?? "bg-slate-100 text-slate-600",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} />
}
