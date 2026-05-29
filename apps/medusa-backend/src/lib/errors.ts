export const ErrorCodes = {
  STORE_NOT_FOUND: "STORE_NOT_FOUND",
  STORE_ACCESS_DENIED: "STORE_ACCESS_DENIED",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRODUCT_NOT_PUBLISHED: "PRODUCT_NOT_PUBLISHED",
  PRODUCT_STORE_MISMATCH: "PRODUCT_STORE_MISMATCH",
  CART_STORE_MISMATCH: "CART_STORE_MISMATCH",
  /** 当前请求的 store 与购物车 metadata.store_id 不一致 */
  CART_STORE_ACCESS_DENIED: "CART_STORE_ACCESS_DENIED",
  ORDER_STORE_MISMATCH: "ORDER_STORE_MISMATCH",
  /** 当前店与订单 metadata.store_id 不一致 */
  ORDER_STORE_ACCESS_DENIED: "ORDER_STORE_ACCESS_DENIED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  STRIPE_WEBHOOK_INVALID: "STRIPE_WEBHOOK_INVALID",
  VALIDATION_ERROR: "VALIDATION_ERROR"
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export const errorResponse = (code: ErrorCode, message: string, status = 400) => ({
  status,
  body: {
    error: {
      code,
      message
    }
  }
})

