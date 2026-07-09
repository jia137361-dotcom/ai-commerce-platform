import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../../modules/store-core"
import type StoreCoreModuleService from "../../../modules/store-core/service"
import { resolveCurrentStore } from "../../../lib/store-context"

type AuthenticatedRequest = MedusaRequest & { auth_context?: { actor_id?: string } }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const customerId = (req as AuthenticatedRequest).auth_context?.actor_id

  if (!customerId) {
    return res.json({ favorites: [], count: 0 })
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const favorites = await storeCore.listProductFavorites({
    store_id: storeId,
    customer_id: customerId,
  })

  const productIds = favorites.map((f: any) => f.product_id)

  let products: any[] = []
  if (productIds.length > 0) {
    const rawProducts = await storeCore.listProducts({
      id: productIds,
      store_id: storeId,
    })
    products = rawProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image_url: p.image_url || p.mockup_image_url,
      status: p.status,
      created_at: p.created_at,
    }))
  }

  return res.json({
    favorites: products,
    count: products.length,
  })
}
