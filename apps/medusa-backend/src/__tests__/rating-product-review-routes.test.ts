import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import {
  GET as getProductReviews,
  POST as createProductReview,
} from "../api/store/products/[id]/reviews/route"

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const product = {
  id: "prod_reviewable",
  store_id: "default_store",
  status: "published",
  title: "Reviewable product",
}

const purchasedOrder = {
  id: "order_1",
  display_id: 1001,
  email: "buyer@example.com",
  metadata: { store_id: "default_store", mc_fulfillment_status: "delivered", buyer_confirmed_received_at: "2026-06-22T00:00:00.000Z" },
  items: [{ metadata: { mc_product_id: product.id } }],
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes["status"]
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes["json"]
  return res as MockRes
}

const createReq = ({
  body = {},
  productId = product.id,
  storeId = "default_store",
  storeCore,
  orderModule,
}: {
  body?: Record<string, unknown>
  productId?: string
  storeId?: string
  storeCore: Record<string, jest.Mock>
  orderModule: Record<string, jest.Mock>
}) =>
  ({
    params: { id: productId },
    query: {},
    body,
    headers: { "x-store-id": storeId },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === STORE_CORE_MODULE) {
          return storeCore
        }
        if (key === Modules.ORDER) {
          return orderModule
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as unknown as MedusaRequest

const validBody = (rating = 5) => ({
  email: "buyer@example.com",
  order_number: 1001,
  rating,
  logistics_rating: rating,
  overall_rating: rating,
  title: "Great print",
  content: "The print quality is good.",
  customer_name: "Jane",
})

const setup = ({
  products = [product],
  existingReviews = [] as Record<string, unknown>[],
  allReviewsAfterCreate = [] as Record<string, unknown>[],
  orders = [purchasedOrder],
  retrievedOrder = purchasedOrder,
  createdReview = {
    id: "prv_1",
    store_id: "default_store",
    product_id: product.id,
    order_id: purchasedOrder.id,
    order_display_id: 1001,
    customer_email: "buyer@example.com",
    customer_name: "Jane",
    rating: 5,
    title: "Great print",
    content: "The print quality is good.",
    status: "published",
    metadata: {},
  },
}: {
  products?: Record<string, unknown>[]
  existingReviews?: Record<string, unknown>[]
  allReviewsAfterCreate?: Record<string, unknown>[]
  orders?: Record<string, unknown>[]
  retrievedOrder?: Record<string, unknown>
  createdReview?: Record<string, unknown>
} = {}) => {
  const storeCore = {
    listProducts: jest.fn(async () => products),
    listProductReviews: jest
      .fn()
      .mockResolvedValueOnce(existingReviews)
      .mockResolvedValueOnce(
        allReviewsAfterCreate.length ? allReviewsAfterCreate : [createdReview]
      ),
    createProductReviews: jest.fn(async (input) => ({ ...createdReview, ...input })),
  }
  const orderModule = {
    listOrders: jest.fn(async () => orders),
    retrieveOrder: jest.fn(async () => retrievedOrder),
  }
  return { storeCore, orderModule }
}

describe("store product review routes", () => {
  it("creates a verified buyer product review and returns updated summary", async () => {
    const { storeCore, orderModule } = setup()
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(storeCore.createProductReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: "default_store",
        product_id: product.id,
        order_id: "order_1",
        order_display_id: 1001,
        customer_email: "buyer@example.com",
        rating: 5,
        status: "published",
      })
    )
    expect(res.body).toMatchObject({
      product_id: product.id,
      store_id: "default_store",
      average_rating: 5,
      review_count: 1,
      rating_breakdown: { "5": 1, "4": 0, "3": 0, "2": 0, "1": 0 },
      review: {
        product_id: product.id,
        order_id: "order_1",
        rating: 5,
      },
    })
  })

  it("lists published reviews and five-star summary", async () => {
    const reviews = [
      { id: "prv_5", store_id: "default_store", product_id: product.id, rating: 5, status: "published" },
      { id: "prv_1", store_id: "default_store", product_id: product.id, rating: 1, status: "published" },
    ]
    const storeCore = {
      listProducts: jest.fn(async () => [product]),
      listProductReviews: jest.fn(async () => reviews),
    }
    const orderModule = {}
    const req = createReq({ storeCore: storeCore as any, orderModule: orderModule as any })
    const res = createRes()

    await getProductReviews(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: product.id,
        store_id: "default_store",
        average_rating: 3,
        review_count: 2,
        rating_breakdown: { "5": 1, "4": 0, "3": 0, "2": 0, "1": 1 },
      })
    )
  })

  it.each([1, 5])("accepts boundary rating=%s", async (rating) => {
    const { storeCore, orderModule } = setup({
      createdReview: {
        id: `prv_${rating}`,
        store_id: "default_store",
        product_id: product.id,
        order_id: "order_1",
        order_display_id: 1001,
        customer_email: "buyer@example.com",
        rating,
        status: "published",
      },
    })
    const req = createReq({ body: validBody(rating), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(storeCore.createProductReviews).toHaveBeenCalledWith(
      expect.objectContaining({ rating })
    )
  })

  it.each([0, 6, -1, 4.5, "5"])("rejects invalid rating=%p", async (rating) => {
    const { storeCore, orderModule } = setup()
    const req = createReq({ body: validBody(rating as any), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "rating must be an integer from 1 to 5",
      },
    })
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })

  it("rejects missing logistics and overall ratings", async () => {
    const { storeCore, orderModule } = setup()
    const req = createReq({
      body: { ...validBody(5), logistics_rating: undefined, overall_rating: undefined },
      storeCore,
      orderModule,
    })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })

  it("accepts optional text and image urls", async () => {
    const { storeCore, orderModule } = setup()
    const req = createReq({
      body: {
        ...validBody(4),
        title: undefined,
        content: undefined,
        image_urls: ["https://example.com/static/reviews/review-1.jpg"],
      },
      storeCore,
      orderModule,
    })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(storeCore.createProductReviews).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          logistics_rating: 4,
          overall_rating: 4,
          image_urls: ["https://example.com/static/reviews/review-1.jpg"],
        }),
      })
    )
  })

  it("rejects missing order number", async () => {
    const { storeCore, orderModule } = setup()
    const req = createReq({
      body: { ...validBody(5), order_number: undefined },
      storeCore,
      orderModule,
    })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    })
  })

  it("rejects nonexistent or cross-store product ids", async () => {
    const { storeCore, orderModule } = setup({ products: [] })
    const req = createReq({
      body: validBody(5),
      productId: "prod_other_store",
      storeCore,
      orderModule,
    })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(storeCore.listProducts).toHaveBeenCalledWith({
      id: "prod_other_store",
      store_id: "default_store",
    })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.body).toMatchObject({
      error: { code: "PRODUCT_NOT_FOUND" },
    })
  })

  it("allows reviews for purchased draft/custom-design products", async () => {
    const draftProduct = { ...product, status: "draft", title: "Custom Design" }
    const { storeCore, orderModule } = setup({
      products: [draftProduct],
      allReviewsAfterCreate: [
        {
          id: "prv_1",
          store_id: "default_store",
          product_id: draftProduct.id,
          rating: 5,
          status: "published",
          metadata: { logistics_rating: 5, overall_rating: 5, image_urls: [] },
        },
      ],
    })
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(storeCore.listProducts).toHaveBeenCalledWith({
      id: draftProduct.id,
      store_id: "default_store",
    })
    expect(storeCore.createProductReviews).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("rejects reviews when the order belongs to another store", async () => {
    const { storeCore, orderModule } = setup({
      orders: [{ ...purchasedOrder, metadata: { store_id: "other_store" } }],
    })
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({
      error: { code: "REVIEW_NOT_ALLOWED" },
    })
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })

  it("rejects reviews when the order did not purchase the product", async () => {
    const { storeCore, orderModule } = setup({
      retrievedOrder: {
        ...purchasedOrder,
        items: [{ metadata: { mc_product_id: "prod_different" } }],
      },
    })
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({
      error: { code: "REVIEW_NOT_ALLOWED" },
    })
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })

  it("rejects reviews before delivery", async () => {
    const waitingOrder = { ...purchasedOrder, metadata: { store_id: "default_store", mc_fulfillment_status: "waiting" } }
    const { storeCore, orderModule } = setup({ orders: [waitingOrder], retrievedOrder: waitingOrder })
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()
    await createProductReview(req as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.body).toMatchObject({ error: { message: "Reviews are available only after delivery" } })
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })

  it("rejects duplicate reviews for the same store product order and email", async () => {
    const { storeCore, orderModule } = setup({
      existingReviews: [{ id: "prv_existing" }],
    })
    const req = createReq({ body: validBody(5), storeCore, orderModule })
    const res = createRes()

    await createProductReview(req as any, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.body).toMatchObject({
      error: {
        code: "REVIEW_NOT_ALLOWED",
        message: "This order has already reviewed this product",
      },
    })
    expect(storeCore.createProductReviews).not.toHaveBeenCalled()
  })
})
