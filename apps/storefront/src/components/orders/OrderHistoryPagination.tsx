export function OrderHistoryPagination({
  count,
  limit,
  offset,
  onPage,
}: {
  count: number
  limit: number
  offset: number
  onPage: (offset: number) => void
}) {
  const previous = Math.max(0, offset - limit)
  const next = offset + limit
  const showingFrom = count ? offset + 1 : 0
  const showingTo = Math.min(count, offset + limit)

  return (
    <nav className="buyer-order-history-pagination" aria-label="Order history pages">
      <span>
        Showing {showingFrom}-{showingTo} of {count}
      </span>
      <div>
        <button type="button" disabled={offset <= 0} onClick={() => onPage(previous)}>
          Previous
        </button>
        <button type="button" disabled={next >= count} onClick={() => onPage(next)}>
          Next
        </button>
      </div>
    </nav>
  )
}
