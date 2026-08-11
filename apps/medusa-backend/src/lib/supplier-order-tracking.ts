import { mapLogisticsStatus } from "../modules/suppliers/s2bdiy/s2bdiy-status-mapper"

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

const text = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

export const normalizeSupplierOrderTracking = (row: Record<string, unknown>) => {
  const raw = record(row.raw_response_json)
  const logistics = record(raw.order_logistics)
  const logisticsStatus = text(
    logistics.logisticss_status,
    logistics.logistics_status,
    logistics.status
  )

  return {
    id: text(row.id),
    supplier: text(row.supplier_id),
    supplier_order_id: text(row.supplier_order_id),
    status: text(row.supplier_status),
    status_text: text(row.supplier_status_text, raw.status_text),
    payment_status: text(row.supplier_pay_status),
    payment_status_text: text(row.supplier_pay_status_text, raw.pay_status_text),
    logistics_name: text(
      row.logistics_name,
      logistics.logistics_name,
      logistics.logisticss_name,
      raw.logistics_platform_text
    ),
    logistics_status: logisticsStatus,
    logistics_status_text: logisticsStatus ? mapLogisticsStatus(Number(logisticsStatus)) : null,
    tracking_number: text(
      row.tracking_number,
      logistics.logisticss_track_number,
      logistics.logistics_track_number,
      logistics.tracking_number
    ),
    tracking_url: text(row.tracking_url, row.waybill_url, logistics.oss_file_src),
    last_synced_at: row.last_synced_at instanceof Date
      ? row.last_synced_at.toISOString()
      : text(row.last_synced_at),
  }
}
