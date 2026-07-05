import { cn } from "../../lib/cn"

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-slate-200 bg-white p-6 shadow-card", className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-slate-900", className)}>{children}</h3>
}
