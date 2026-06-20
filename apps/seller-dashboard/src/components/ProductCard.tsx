import type { NormalizedProduct } from "@ai-commerce/shared-types"
import { Link } from "react-router-dom"
import { StatusBadge } from "./StatusBadge"

type Props = { product: NormalizedProduct }

export function ProductCard({ product }: Props) {
  const image = product.mockup_image_url ?? product.image_url ?? product.design_image_url
  return (
    <Link
      to={`/products/${product.product_id}/edit`}
      className="flex gap-4 rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-400"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-medium">{product.title}</h3>
          <StatusBadge
            status={product.status}
            source={product.source}
            metadata={product.metadata}
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">${product.price?.toFixed(2) ?? "—"}</p>
      </div>
    </Link>
  )
}
