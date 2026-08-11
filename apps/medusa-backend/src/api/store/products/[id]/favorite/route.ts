import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { resolveCurrentStore } from "../../../../../lib/store-context"

type AuthenticatedRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: storeId } = resolveCurrentStore(req)
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    return res.json({ is_favorited: false })
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const favorites = await storeCore.listProductFavorites({
    store_id: storeId,
    product_id: productId,
    customer_id: customerId,
  })

  return res.json({ is_favorited: favorites.length > 0 })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: storeId } = resolveCurrentStore(req)
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in to favorite products" },
    })
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const existing = await storeCore.listProductFavorites({
    store_id: storeId,
    product_id: productId,
    customer_id: customerId,
  })

  if (existing.length > 0) {
    return res.json({ is_favorited: true, message: "Already favorited" })
  }

  await storeCore.createProductFavorites({
    store_id: storeId,
    product_id: productId,
    customer_id: customerId,
  })

  return res.json({ is_favorited: true, message: "Added to favorites" })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: storeId } = resolveCurrentStore(req)
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in to manage favorites" },
    })
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const existing = await storeCore.listProductFavorites({
    store_id: storeId,
    product_id: productId,
    customer_id: customerId,
  })

  if (existing.length === 0) {
    return res.json({ is_favorited: false, message: "Not favorited" })
  }

  await storeCore.deleteProductFavorites({ id: existing[0].id })

  return res.json({ is_favorited: false, message: "Removed from favorites" })
}
