/**
 * Buyer My Design drafts (Studio save results).
 *
 * GET /store/my-designs
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { getStoreCoreService } from "../../_helpers/store-core"
import { readString } from "../../../lib/product-cart-bridge"
import {
  buyerOwnsResource,
  readBuyerResourceOwner,
} from "../../../lib/buyer-resource-ownership"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

function isBuyerDesign(product: Record<string, unknown>) {
  const metadata =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  return metadata.buyer_design === true
}

/** @deprecated Import buyerOwnsResource + readBuyerResourceOwner instead. */
export function buyerOwnsDesign(
  metadata: Record<string, unknown>,
  customerId: string | null,
  guestKey: string | null
) {
  return buyerOwnsResource(readBuyerResourceOwner(metadata), customerId, guestKey)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id ?? null
  const guestKey =
    typeof req.query?.guest_key === "string" && req.query.guest_key.trim()
      ? req.query.guest_key.trim()
      : null

  const products = (await storeCoreService.listProducts(
    { store_id: storeId },
    { order: { created_at: "DESC" }, take: 200 }
  )) as Array<Record<string, unknown>>

  const designs = products
    .filter((product) => isBuyerDesign(product))
    .filter((product) => {
      const metadata =
        product.metadata && typeof product.metadata === "object"
          ? (product.metadata as Record<string, unknown>)
          : {}
      return buyerOwnsDesign(metadata, customerId, guestKey)
    })
    .map((product) => {
      const metadata =
        product.metadata && typeof product.metadata === "object"
          ? (product.metadata as Record<string, unknown>)
          : {}
      return {
        mc_product_id: String(product.id),
        medusa_variant_id: readString(product.medusa_variant_id),
        title: readString(product.title) ?? "Custom Design",
        mockup_url: readString(product.mockup_image_url) ?? readString(product.image_url),
        price: typeof product.price === "number" ? product.price : null,
        status: readString(product.status) ?? "draft",
        s2b_product_id: readString(metadata.s2b_product_id) ?? readString(product.supplier_product_id),
        basic_product_id: readString(product.basic_product_id),
        blank_product_id: readString(metadata.blank_product_id),
        editor_path: `/design/${encodeURIComponent(String(product.id))}`,
        created_at: product.created_at ?? null,
      }
    })

  return res.json({ designs, count: designs.length })
}
