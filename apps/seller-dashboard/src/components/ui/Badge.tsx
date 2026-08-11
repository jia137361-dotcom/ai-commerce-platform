import { cn } from "../../lib/cn"

const VARIANTS: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  paid: "bg-emerald-50 text-emerald-700",
  delivered: "bg-emerald-50 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  running: "bg-orange-50 text-[var(--color-primary)]",
  queued: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  refunded: "bg-red-50 text-red-600",
  cancelled: "bg-red-50 text-red-600",
  unpublished: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-500",
  active: "bg-emerald-50 text-emerald-700",
  exclusive: "bg-orange-50 text-[var(--color-primary)]",
  default: "bg-slate-100 text-slate-600",
}

export function Badge({ label, className }: { label: string; className?: string }) {
  const key = label.toLowerCase().replace(/\s+/g, "_")
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-semibold uppercase",
        VARIANTS[key] ?? "bg-slate-100 text-slate-600",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}
