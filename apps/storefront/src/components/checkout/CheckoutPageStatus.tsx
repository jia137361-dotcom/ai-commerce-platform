import { EmptyState, ErrorState, LoadingState } from "../ui/States"

export function CheckoutPageStatus({ loading, error, empty, onRetry }: { loading: boolean; error?: string; empty: boolean; onRetry: () => void }) {
  if (loading) return <LoadingState label="Loading checkout..." />
  if (error) return <ErrorState title="Checkout cart unavailable" message={error} action={{ label: "Try again", onClick: onRetry }} />
  if (empty) return <EmptyState title="Your cart is empty" message="Add products before continuing to checkout." action={{ label: "Back to store", href: "/store" }} />
  return null
}
