import type { StoreProduct } from "../../lib/mock-data"
import { EmptyState, ErrorState, LoadingState } from "../ui/States"
import { ProductCard } from "../products/ProductCard"

type StoreProductResultsProps = {
  loading: boolean
  error?: string
  products: StoreProduct[]
  hasFilters: boolean
  onRetry: () => void
}

export function StoreProductResults({ loading, error, products, hasFilters, onRetry }: StoreProductResultsProps) {
  if (loading) return <LoadingState label="Loading products..." />
  if (error && !products.length) {
    return <ErrorState message={error} action={{ label: "Try again", onClick: onRetry }} />
  }
  if (!products.length) {
    return (
      <EmptyState
        title={hasFilters ? "No matching products" : "No products yet"}
        message={hasFilters ? "Try another category or search term." : "This store has not published products yet."}
      />
    )
  }

  return (
    <section className="buyer-shop-product-grid" aria-label="Products">
      {products.map((product) => <div key={product.id}><ProductCard product={product} /></div>)}
    </section>
  )
}
