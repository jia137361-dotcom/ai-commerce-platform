import { cn } from "../../lib/cn"
import { Button } from "./Button"

type PaginationProps = {
  offset: number
  limit: number
  count: number
  onPageChange: (offset: number) => void
  label?: string
}

export function Pagination({ offset, limit, count, onPageChange, label }: PaginationProps) {
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(count / limit))
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
      {label ? <span>{label}</span> : <span>Page {page} of {totalPages}</span>}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={offset <= 0}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange((p - 1) * limit)}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-sm font-medium",
              page === p ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {p}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={offset + limit >= count}
          onClick={() => onPageChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-6 border-b border-slate-200">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "pb-3 text-sm font-medium transition",
            value === item.id
              ? "border-b-2 border-brand text-brand"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
