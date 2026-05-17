import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertCartBelongsToCurrentStore, readCartStoreId } from "../../../../../lib/assert-cart-store"
import addLineItemWorkflow from "../../../../../workflows/add-line-item"
import { CartStoreAccessError, CartStoreMismatchError } from "../../../../../lib/cart-store-error"
import { readWorkflowErrorMessage } from "../../../../../lib/workflow-error"
import { getStoreCoreService } from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cart_id = req.params.id as string
    const body = (req.body || {}) as {
      variant_id?: string
      quantity?: number
    }

    if (!body.variant_id) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "variant_id is required",
        },
      })
    }

    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id)
    assertCartBelongsToCurrentStore(req, cart)
    const cartStoreId = readCartStoreId(cart)
    const storeCoreService = getStoreCoreService(req)
    const variant_id = body.variant_id
    const linkedProducts = await storeCoreService.listProducts({
      medusa_variant_id: variant_id,
    })
    const linkedProduct = linkedProducts[0]

    if (!linkedProduct) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "variant_id must be linked to a store-core product",
        },
      })
    }

    if (linkedProduct.status !== "published") {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Product must be published",
        },
      })
    }

    if (linkedProduct.store_id !== cartStoreId) {
      throw new CartStoreMismatchError()
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
    const message = readWorkflowErrorMessage(error)
    console.error("加入购物车商品失败:", error)
    res.status(400).json({
      error: {
        code: "CART_LINE_ITEM_ERROR",
        message,
      },
    })
  }
}
