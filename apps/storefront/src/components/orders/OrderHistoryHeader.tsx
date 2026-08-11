type OrderHistoryHeaderProps = {
  signedInEmail?: string | null
  onOpenSearch?: () => void
}

export function OrderHistoryHeader({ signedInEmail, onOpenSearch }: OrderHistoryHeaderProps) {
  return (
    <section className="buyer-order-history-header buyer-order-history-header--temu">
      <div className="buyer-order-history-topline">
        <a className="buyer-order-history-back" href="/account" aria-label="Back">
          ‹
        </a>
        <h1>Your order</h1>
        <button
          type="button"
          className="buyer-order-history-search"
          aria-label="Search orders"
          onClick={() => {
            if (onOpenSearch) onOpenSearch()
            else window.location.assign("/orders/lookup")
          }}
        >
          ⌕
        </button>
      </div>
      {signedInEmail ? <p className="buyer-order-history-email">{signedInEmail}</p> : null}
    </section>
  )
}
