import { EmptyState, ErrorState, LoadingState } from "../ui/States"

type CartPageStatusProps = { loading: boolean; error?: string; empty: boolean; onRetry: () => void }

export function CartPageStatus({ loading, error, empty, onRetry }: CartPageStatusProps) {
  if (loading) return <LoadingState label="Loading cart..." />
  if (error) return <ErrorState title="Cart is unavailable" message={error} action={{ label: "Try again", onClick: onRetry }} />
  if (empty) {
    return (
      <EmptyState
        title="Your cart is empty"
        message="Designs you order from My Designs show up here for quantity, shipping, and checkout."
        action={{ label: "View My Designs", href: "/my-designs" }}
        secondaryAction={{ label: "Continue shopping", href: "/store" }}
      />
    )
  }
  return null
}
