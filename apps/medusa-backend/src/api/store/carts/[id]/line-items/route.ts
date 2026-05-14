import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import addLineItemWorkflow from "../../../../../workflows/add-line-item"
import { CartStoreAccessError, CartStoreMismatchError } from "../../../../../lib/cart-store-error"
import { getStoreCoreService } from "../../../../_helpers/store-core"

const readString = (value: unknown) => {
  return typeof value === "string" && value.length > 0 ? value : null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cart_id = req.params.id as string
    const body = (req.body || {}) as {
      product_id?: string
      variant_id?: string
      quantity?: number
    }

    if (!body.product_id && !body.variant_id) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "product_id or variant_id is required",
        },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id)
    assertCartBelongsToCurrentStore(req, cart)
    const cartStoreId = readCartStoreId(cart)
    let variant_id = body.variant_id

    if (body.product_id) {
      const storeCoreService = getStoreCoreService(req)
      const products = await storeCoreService.listProducts({ id: body.product_id })
      const product = products[0]

      if (!product) {
        return res.status(404).json({
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        })
      }

      if (product.store_id !== cartStoreId) {
        throw new CartStoreMismatchError()
      }

      if (product.status !== "published") {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Product must be published",
          },
        })
      }

      variant_id = readString(product.medusa_variant_id) ?? undefined

      if (!variant_id) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Product is not cart-addable",
          },
        })
      }
    }

    const { result } = await addLineItemWorkflow(req.scope).run({
      input: {
        cart_id,
        variant_id: variant_id as string,
        quantity: body.quantity ?? 1,
      },
    })

    const cartOut = result.cart
    const meta = cartOut.metadata as Record<string, unknown> | null | undefined
    const store_id = typeof meta?.store_id === "string" ? meta.store_id : undefined

    res.status(200).json({
      cart_id: cartOut.id,
      store_id,
      line_item: result.lineItem,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreMismatchError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("加入购物车商品失败:", error)
    res.status(400).json({ error: message })
  }
}
