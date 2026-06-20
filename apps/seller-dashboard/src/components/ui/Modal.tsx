import { cn } from "../../lib/cn"

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="text-sm text-slate-600">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: React.ReactNode
  items: Array<{ label: string; onClick: () => void; variant?: "default" | "primary" | "danger" }>
}) {
  return (
    <div className="group relative inline-block">
      {trigger}
      <div className="invisible absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg border bg-white p-1 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cn(
              "block w-full rounded-md px-3 py-2 text-left text-sm",
              item.variant === "primary" && "font-medium text-brand hover:bg-brand-light",
              item.variant === "danger" && "text-red-600 hover:bg-red-50",
              (!item.variant || item.variant === "default") && "text-slate-700 hover:bg-slate-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
