/** 自定义订单 metadata：与 Medusa Order 并存，供店铺/履约/支付状态展示 */

export const ORDER_META_STORE_ID = "store_id"
export const ORDER_META_PAYMENT_STATUS = "payment_status"

/**
 * 平台履约阶段（等待推单 / 已推供应商 / 已发货），勿使用键名 `fulfillment_status`：
 * Medusa Admin 会把 metadata 摊平到订单 DTO，`waiting`/`pushed` 等会覆盖原生履约枚举导致后台白屏。
 */
export const ORDER_META_FULFILLMENT_STATUS = "mc_fulfillment_status"

/** 历史错误键名：读取时兼容；写入须先 {@link normalizeOrderMetadata} */
const LEGACY_ORDER_META_FULFILLMENT_STATUS = "fulfillment_status"

export type OrderPaymentStatus = "pending" | "paid"
export type OrderFulfillmentStatus = "none" | "waiting" | "pushed" | "shipped"

export function normalizeOrderMetadata(
  meta: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const m = { ...(meta ?? {}) }
  if (
    LEGACY_ORDER_META_FULFILLMENT_STATUS in m &&
    !(ORDER_META_FULFILLMENT_STATUS in m)
  ) {
    m[ORDER_META_FULFILLMENT_STATUS] = m[LEGACY_ORDER_META_FULFILLMENT_STATUS]
  }
  delete m[LEGACY_ORDER_META_FULFILLMENT_STATUS]
  return m
}

export function readOrderFulfillmentStatusMeta(
  meta: Record<string, unknown> | null | undefined
): unknown {
  if (!meta) return undefined
  return meta[ORDER_META_FULFILLMENT_STATUS] ?? meta[LEGACY_ORDER_META_FULFILLMENT_STATUS]
}

/** Medusa Admin 订单表的 FulfillmentStatusCell 只接受原生履约枚举字符串 */
const MEDUSA_ADMIN_ORDER_FULFILLMENT_KEYS = [
  "not_fulfilled",
  "partially_fulfilled",
  "fulfilled",
  "partially_shipped",
  "shipped",
  "delivered",
  "partially_delivered",
  "partially_returned",
  "returned",
  "canceled",
  "requires_action",
] as const

export type MedusaAdminOrderFulfillmentStatus =
  (typeof MEDUSA_ADMIN_ORDER_FULFILLMENT_KEYS)[number]

const MEDUSA_ADMIN_FULFILLMENT_SET = new Set<string>(MEDUSA_ADMIN_ORDER_FULFILLMENT_KEYS)

/** 把我们的 metadata 履约阶段转成 Admin 列表里 FulfillmentStatusCell 可用的 fulfillment_status（避免白屏） */
export function toMedusaAdminOrderFulfillmentStatus(
  mcOrNative: unknown
): MedusaAdminOrderFulfillmentStatus {
  if (typeof mcOrNative === "string" && MEDUSA_ADMIN_FULFILLMENT_SET.has(mcOrNative)) {
    return mcOrNative as MedusaAdminOrderFulfillmentStatus
  }
  switch (mcOrNative) {
    case "waiting":
    case "none":
      return "not_fulfilled"
    case "pushed":
      return "requires_action"
    case "shipped":
      return "shipped"
    default:
      return "not_fulfilled"
  }
}

/** Medusa Admin 订单表的 PaymentStatusCell 只接受原生支付枚举字符串（见 dashboard getOrderPaymentStatus） */
const MEDUSA_ADMIN_ORDER_PAYMENT_KEYS = [
  "not_paid",
  "authorized",
  "partially_authorized",
  "awaiting",
  "captured",
  "refunded",
  "partially_refunded",
  "partially_captured",
  "canceled",
  "requires_action",
] as const

export type MedusaAdminOrderPaymentStatus = (typeof MEDUSA_ADMIN_ORDER_PAYMENT_KEYS)[number]

const MEDUSA_ADMIN_PAYMENT_SET = new Set<string>(MEDUSA_ADMIN_ORDER_PAYMENT_KEYS)

/** 把 metadata 里的 payment_status（pending/paid）转成 Admin 可用的 payment_status，避免 PaymentStatusCell 白屏 */
export function toMedusaAdminOrderPaymentStatus(
  customOrNative: unknown
): MedusaAdminOrderPaymentStatus {
  if (typeof customOrNative === "string" && MEDUSA_ADMIN_PAYMENT_SET.has(customOrNative)) {
    return customOrNative as MedusaAdminOrderPaymentStatus
  }
  switch (customOrNative) {
    case "pending":
      return "awaiting"
    case "paid":
      return "captured"
    default:
      return "not_paid"
  }
}
