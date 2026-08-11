import { ErrorState, LoadingState } from "../ui/States"

type ProductDetailStatusProps = { loading: boolean; error?: string; onRetry: () => void }

export function ProductDetailStatus({ loading, error, onRetry }: ProductDetailStatusProps) {
  if (loading) return <LoadingState label="Loading product detail..." />
  if (!error) return null
  const notFound = /404|not found|no product/i.test(error)
  return <ErrorState title={notFound ? "Product not found" : "Unable to load product"} message={notFound ? "This product may no longer be available." : error} action={{ label: "Try again", onClick: onRetry }} />
}
