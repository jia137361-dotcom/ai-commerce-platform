import { cn } from "../../lib/cn"

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card", className)}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  )
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  )
}

export function DataTableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn("border-t border-slate-100 transition hover:bg-slate-50/60", className)}>
      {children}
    </tr>
  )
}

export function DataTableCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn("px-4 py-3.5 text-slate-700", className)}>{children}</td>
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <th className={cn("px-4 py-3.5", className)}>{children}</th>
}
