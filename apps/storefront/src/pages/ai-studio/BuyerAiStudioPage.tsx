import { AiDesignPage } from "../ai-design/AiDesignPage"

/** @deprecated Prefer /ai-design routes. Thin wrapper for old /ai-studio/:id imports. */
export function BuyerAiStudioPage({
  productId,
  cartCount,
}: {
  productId: string
  cartCount: number
}) {
  return <AiDesignPage cartCount={cartCount} productIdFromPath={productId} />
}
