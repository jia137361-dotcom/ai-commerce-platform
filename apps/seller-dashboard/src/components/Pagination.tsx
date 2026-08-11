type Props = {
  offset: number
  limit: number
  count: number
  onPageChange: (offset: number) => void
}

export function Pagination({ offset, limit, count, onPageChange }: Props) {
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(count / limit))

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-600">
        Page {page} of {totalPages} ({count} total)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={offset <= 0}
          className="rounded border px-3 py-1 disabled:opacity-40"
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={offset + limit >= count}
          className="rounded border px-3 py-1 disabled:opacity-40"
          onClick={() => onPageChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
