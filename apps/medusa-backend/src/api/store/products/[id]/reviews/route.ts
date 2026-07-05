import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { readOrderStoreId } from "../../../../../lib/order-store-context"
import {
  buildReviewMetadata,
  isValidReviewRating,
  maskReviewEmail,
  normalizeProductReview,
  parseReviewImageUrls,
  parseReviewText,
  readMcProductIdsFromOrder,
  REVIEW_MAX_IMAGES,
  summarizeProductReviews,
} from "../../../../../lib/product-reviews"
import { resolveBuyerOrderFulfillmentStatus } from "../../../../../lib/order-custom-metadata"
import { isReceiptConfirmed } from "../../../../../lib/order-receipt-confirmation"
import {
  getStoreCoreService,
  sendError,
} from "../../../../_helpers/store-core"

type CreateReviewBody = {
  email?: string
  order_number?: string | number
  display_id?: string | number
  rating?: unknown
  logistics_rating?: unknown
  overall_rating?: unknown
  title?: unknown
  content?: unknown
  customer_name?: unknown
  image_urls?: unknown
}

const parseDisplayId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
  }
  return null
}

const findPurchasedOrder = async (
  req: MedusaRequest,
  input: {
    email: string
    displayId: number
    storeId: string
    productId: string
  }
) => {
  const { email, displayId, storeId, productId } = input
  const orderModule = req.scope.resolve(Modules.ORDER)
  const orders = await orderModule.listOrders(
    { email, display_id: displayId } as Parameters<typeof orderModule.listOrders>[0],
    { take: 5, order: { created_at: "DESC" } }
  )

  for (const order of orders) {
    if (readOrderStoreId(order) !== storeId) {
      continue
    }

    const fullOrder = await orderModule.retrieveOrder(order.id, {
      relations: ["items"],
    })
    if (
      readMcProductIdsFromOrder(fullOrder as unknown as Record<string, unknown>).includes(
        productId
      )
    ) {
      return fullOrder
    }
  }

  return null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = (req.params.id ?? req.params.product_id) as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
    status: "published",
  })
  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const limitRaw = Number(req.query?.limit ?? 20)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100)

  const allReviews = await (storeCoreService as any).listProductReviews(
    {
      store_id: storeId,
      product_id: productId,
      status: "published",
    },
    {
      order: { created_at: "DESC" },
    }
  )
  const summary = summarizeProductReviews(allReviews)

  return res.json({
    product_id: productId,
    store_id: storeId,
    average_rating: summary.average_rating,
    review_count: summary.review_count,
    rating_breakdown: summary.rating_breakdown,
    reviews: allReviews.slice(0, limit).map(normalizeProductReview),
  })
}

export const POST = async (
  req: MedusaRequest<CreateReviewBody>,
  res: MedusaResponse
) => {
  const productId = (req.params.id ?? req.params.product_id) as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const body = req.body ?? {}

  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
    status: "published",
  })
  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : null
  const displayId = parseDisplayId(body.display_id ?? body.order_number)
  const rating = body.rating
  const logisticsRating = body.logistics_rating
  const overallRating = body.overall_rating
  const title = parseReviewText(body.title, 120)
  const content = parseReviewText(body.content, 2000)
  const customerName = parseReviewText(body.customer_name, 120)
  const imageUrls = parseReviewImageUrls(body.image_urls)

  if (!email || !email.includes("@")) {
    return sendError(res, 400, "VALIDATION_ERROR", "email is required")
  }
  if (!displayId) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "order_number or display_id is required"
    )
  }
  if (!isValidReviewRating(rating)) {
    return sendError(res, 400, "VALIDATION_ERROR", "rating must be an integer from 1 to 5")
  }
  if (!isValidReviewRating(logisticsRating)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "logistics_rating must be an integer from 1 to 5"
    )
  }
  if (!isValidReviewRating(overallRating)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "overall_rating must be an integer from 1 to 5"
    )
  }
  if (title === undefined) {
    return sendError(res, 400, "VALIDATION_ERROR", "title must be 120 characters or fewer")
  }
  if (content === undefined) {
    return sendError(res, 400, "VALIDATION_ERROR", "content must be 2000 characters or fewer")
  }
  if (customerName === undefined) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "customer_name must be 120 characters or fewer"
    )
  }
  if (imageUrls === undefined) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      `image_urls must be an array of up to ${REVIEW_MAX_IMAGES} URLs`
    )
  }

  const order = await findPurchasedOrder(req, {
    email,
    displayId,
    storeId,
    productId,
  })

  if (!order) {
    return sendError(
      res,
      403,
      "REVIEW_NOT_ALLOWED",
      "Only verified buyers can review this product"
    )
  }

  if (resolveBuyerOrderFulfillmentStatus(order.metadata as Record<string, unknown> | null) !== "delivered") {
    return sendError(res, 403, "REVIEW_NOT_ALLOWED", "Reviews are available only after delivery")
  }
  if (!isReceiptConfirmed(order)) {
    return sendError(res, 403, "REVIEW_NOT_ALLOWED", "Confirm receipt before reviewing this product")
  }

  const existing = await (storeCoreService as any).listProductReviews({
    store_id: storeId,
    product_id: productId,
    order_id: order.id,
    customer_email: email,
  })

  if (existing.length > 0) {
    return sendError(
      res,
      409,
      "REVIEW_NOT_ALLOWED",
      "This order has already reviewed this product"
    )
  }

  const created = await (storeCoreService as any).createProductReviews({
    store_id: storeId,
    product_id: productId,
    order_id: order.id,
    order_display_id: displayId,
    customer_email: email,
    customer_name: customerName ?? maskReviewEmail(email),
    rating,
    title,
    content,
    status: "published",
    metadata: buildReviewMetadata({
      logistics_rating: logisticsRating,
      overall_rating: overallRating,
      image_urls: imageUrls ?? [],
    }),
  })
  const review = Array.isArray(created) ? created[0] : created

  const allReviews = await (storeCoreService as any).listProductReviews({
    store_id: storeId,
    product_id: productId,
    status: "published",
  })
  const summary = summarizeProductReviews(allReviews)

  return res.status(201).json({
    product_id: productId,
    store_id: storeId,
    average_rating: summary.average_rating,
    review_count: summary.review_count,
    rating_breakdown: summary.rating_breakdown,
    review: normalizeProductReview(review),
  })
}
