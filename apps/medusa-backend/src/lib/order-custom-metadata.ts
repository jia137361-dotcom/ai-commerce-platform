/** 自定义订单 metadata：与 Medusa Order 并存，供店铺/履约/支付状态展示 */
export const ORDER_META_STORE_ID = "store_id"
export const ORDER_META_PAYMENT_STATUS = "payment_status"
export const ORDER_META_FULFILLMENT_STATUS = "fulfillment_status"

export type OrderPaymentStatus = "pending" | "paid"
export type OrderFulfillmentStatus = "none" | "waiting" | "pushed" | "shipped"
