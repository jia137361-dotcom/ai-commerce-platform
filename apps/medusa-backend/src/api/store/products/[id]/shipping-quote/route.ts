import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { getStoreCoreService } from "../../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-client"
import { calculateLogisticsClient, pickLogisticsOption } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-logistics"
import { convertShippingCnyToUsdWithMargin } from "../../../../../lib/pricing"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) return res.status(503).json({ error: { message: "S2BDIY shipping is not configured" } })
  const { store_id: storeId } = resolveCurrentStore(req)
  const productId = String(req.params.id)
  const query = req.query as { country?: string; size_id?: string; quantity?: string }
  const country = query.country?.trim().toUpperCase() || "US"
  const quantity = Math.max(1, Number(query.quantity || 1) || 1)
  const storeCore = getStoreCoreService(req)
  const products = await storeCore.listProducts({ id: productId, store_id: storeId })
  const product = products[0] as any
  if (!product?.basic_product_id || !product.supplier_product_id) return res.status(404).json({ error: { message: "Supplier product not found" } })
  const supplierRows = await storeCore.listSupplierProducts({ id: product.supplier_product_id })
  const raw = (supplierRows[0]?.raw_json ?? {}) as Record<string, any>
  const specs = Array.isArray(raw.size_specifications) ? raw.size_specifications : []
  const spec = specs.find((item: any) => String(item.size_id) === String(query.size_id)) ?? specs[0]
  const result = await calculateLogisticsClient(new S2bdiyClient(config), {
    basic_product_id: product.basic_product_id,
    platform: config.platformId,
    num: quantity,
    country,
    weight: Number(spec?.weight ?? process.env.S2BDIY_DEFAULT_WEIGHT ?? 0.3),
    length: Number(spec?.length ?? process.env.S2BDIY_DEFAULT_LENGTH ?? 30),
    width: Number(spec?.width ?? process.env.S2BDIY_DEFAULT_WIDTH ?? 25),
    height: Number(spec?.height ?? process.env.S2BDIY_DEFAULT_HEIGHT ?? 2),
  })
  const selected = pickLogisticsOption(result, true)
  if (!selected) return res.status(404).json({ error: { message: "No shipping quote available" } })
  const amountCny = Number(selected.amount ?? 0)
  const amountUsd = convertShippingCnyToUsdWithMargin(amountCny)
  return res.json({ quote: { amount_usd: amountUsd, amount_cny: amountCny, currency_code: "usd", logistics_name: selected.name ?? null, day_from: selected.day_from ?? null, day_to: selected.day_to ?? null, country, quantity } })
}
