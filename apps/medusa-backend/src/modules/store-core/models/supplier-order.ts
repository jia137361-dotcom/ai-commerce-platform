import { model } from "@medusajs/framework/utils"

const SupplierOrder = model.define("mc_supplier_order", {
  id: model.id({ prefix: "so" }).primaryKey(),
  store_id: model.text(),
  order_id: model.text(),
  supplier_id: model.text(),
  supplier_order_id: model.text().nullable(),
  third_order_id: model.text(),
  platform: model.number().default(99),
  logistics_id: model.text().nullable(),
  logistics_name: model.text().nullable(),
  product_amount: model.float().nullable(),
  shipping_amount: model.float().nullable(),
  total_amount: model.float().nullable(),
  supplier_status: model.text().default("not_pushed"),
  supplier_status_text: model.text().nullable(),
  supplier_pay_status: model.text().default("payment_pending"),
  supplier_pay_status_text: model.text().nullable(),
  tracking_number: model.text().nullable(),
  tracking_url: model.text().nullable(),
  waybill_url: model.text().nullable(),
  raw_request_json: model.json().nullable(),
  raw_response_json: model.json().nullable(),
  last_synced_at: model.dateTime().nullable(),
  error_message: model.text().nullable(),
  pay_retry_count: model.number().default(0),
})

export default SupplierOrder
