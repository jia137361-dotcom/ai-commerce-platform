import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { applySkuUpdates, normalizeProductSkus, type ProductSkuUpdate } from "../../../lib/product-sku"
import { ensureNativeBridgeCartable } from "../../../lib/ensure-native-bridge-cartable"
import { resolveNativeBridgeForPublish } from "../../../lib/native-product-bridge"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

type SkuRow = Record<string, unknown>

const readText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null
const readNumber = (value: unknown) => {
  const valueAsNumber = typeof value === "number" ? value : Number(value)
  return Number.isFinite(valueAsNumber) ? valueAsNumber : null
}
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? value as Record<string, unknown> : {}

const parseLimit = (value: unknown) => Math.min(Math.max(Number(value) || 50, 1), 100)
const parseOffset = (value: unknown) => Math.max(Number(value) || 0, 0)

const includes = (value: unknown, query?: string | null) =>
  !query || String(value ?? "").toLowerCase().includes(query)

const productSkuRows = async (req: MedusaRequest, storeId: string): Promise<SkuRow[]> => {
  const service = getStoreCoreService(req) as any
  const products = await service.listProducts({ store_id: storeId }, { order: { updated_at: "DESC" } })
  const supplierProductIds = [...new Set(products.map((product: any) => readText(product.supplier_product_id)).filter(Boolean))]
  const [supplierProducts, supplierVariants, printSpecs] = await Promise.all([
    supplierProductIds.length ? service.listSupplierProducts({ id: supplierProductIds }) : [],
    supplierProductIds.length ? service.listSupplierProductVariants({ supplier_product_id: supplierProductIds }) : [],
    supplierProductIds.length ? service.listSupplierPrintSpecs({ supplier_product_id: supplierProductIds }) : [],
  ])
  const supplierProductById = new Map((supplierProducts as any[]).map((row) => [row.id, row]))
  const supplierVariantById = new Map<string, any>()
  for (const variant of supplierVariants as any[]) {
    if (readText(variant.id)) supplierVariantById.set(variant.id, variant)
    if (readText(variant.supplier_variant_id)) supplierVariantById.set(variant.supplier_variant_id, variant)
  }
  const printSpecsByProduct = new Map<string, any[]>()
  for (const spec of printSpecs as any[]) {
    const id = readText(spec.supplier_product_id)
    if (!id) continue
    printSpecsByProduct.set(id, [...(printSpecsByProduct.get(id) ?? []), spec])
  }

  return products.flatMap((product: any) => {
    const supplierProduct = supplierProductById.get(product.supplier_product_id)
    return normalizeProductSkus(product.variants).map((sku) => {
      const providerVariant = supplierVariantById.get(sku.supplier_variant_id)
      const provider = providerVariant ?? {}
      const supplierProductId = readText(product.supplier_product_id)
      const externalVariantId = readText(sku.supplier_external_variant_id) ?? readText(provider.supplier_variant_id)
      const platformSku = readText(sku.platform_sku) ?? readText(sku.sku) ?? `CG-${product.id}-${sku.supplier_variant_id}`
      const cost = readNumber(sku.cost) ?? readNumber(provider.cost)
      const defaultPrice = readNumber(sku.price) ?? readNumber(product.price)
      const override = readNumber(sku.price_override)
      return {
        sku_id: `${product.id}:${sku.supplier_variant_id}`,
        product_id: product.id,
        product_title: product.title,
        product_status: product.status,
        image_url: product.image_url ?? product.mockup_image_url ?? supplierProduct?.product_show_master_image ?? null,
        supplier_id: product.supplier_id ?? supplierProduct?.supplier_id ?? null,
        supplier_name: supplierProduct?.supplier_id === "sup_s2bdiy" ? "S2BDIY" : supplierProduct?.supplier_id ?? null,
        supplier_product_id: supplierProductId,
        supplier_external_product_id: supplierProduct?.supplier_product_id ?? null,
        basic_product_id: product.basic_product_id ?? supplierProduct?.basic_product_id ?? null,
        supplier_variant_id: sku.supplier_variant_id,
        supplier_external_variant_id: externalVariantId,
        platform_sku: platformSku,
        supplier_sku: readText(sku.supplier_sku) ?? readText(sku.sku) ?? readText(provider.sku) ?? readText(provider.supplier_variant_code),
        color: sku.color ?? provider.color_name ?? provider.color ?? null,
        size: sku.size ?? provider.size_name ?? provider.size ?? null,
        weight: readNumber(sku.weight) ?? readNumber(provider.weight),
        length: readNumber(sku.length) ?? readNumber(provider.length),
        width: readNumber(sku.width) ?? readNumber(provider.width),
        height: readNumber(sku.height) ?? readNumber(provider.height),
        cost,
        default_price: defaultPrice,
        price_override: override,
        final_price: override ?? defaultPrice,
        enabled: sku.enabled !== false,
        warehouse_name: sku.warehouse_name ?? supplierProduct?.warehouse_name ?? null,
        ship_from_country: sku.ship_from_country ?? product.ship_from_country ?? supplierProduct?.produce_country ?? null,
        print_specs: (printSpecsByProduct.get(supplierProductId ?? "") ?? []).map((spec) => ({
          print_spec_id: spec.id,
          view_id: spec.view_id,
          view_name: spec.view_en_name ?? spec.view_name,
          print_position: spec.print_position,
          width: spec.print_file_width,
          height: spec.print_file_height,
          dpi: spec.dpi,
        })),
      }
    })
  })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const query = (req.query ?? {}) as Record<string, unknown>
  const q = readText(query.q)?.toLowerCase() ?? null
  const productId = readText(query.product_id)
  const status = readText(query.status)
  const supplierId = readText(query.supplier_id)
  const warehouse = readText(query.warehouse)
  const color = readText(query.color)
  const size = readText(query.size)
  const enabled = readText(query.enabled)
  const all = await productSkuRows(req, storeId)
  const filtered = all.filter((row) =>
    (!productId || row.product_id === productId) &&
    (!status || row.product_status === status) &&
    (!supplierId || row.supplier_id === supplierId) &&
    (!warehouse || row.warehouse_name === warehouse) &&
    (!color || row.color === color) &&
    (!size || row.size === size) &&
    (!enabled || String(row.enabled) === enabled) &&
    [row.product_title, row.platform_sku, row.supplier_sku, row.supplier_external_product_id, row.supplier_external_variant_id]
      .some((value) => includes(value, q))
  )
  const limit = parseLimit(query.limit)
  const offset = parseOffset(query.offset)
  return res.json({ store_id: storeId, count: filtered.length, limit, offset, skus: filtered.slice(offset, offset + limit) })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = asRecord(req.body)
  const productId = readText(body.product_id)
  const updates = Array.isArray(body.updates) ? body.updates : []
  if (!productId || !updates.length) return sendError(res, 400, "VALIDATION_ERROR", "product_id and updates are required")

  const normalized: ProductSkuUpdate[] = []
  for (const value of updates) {
    const update = asRecord(value)
    const supplierVariantId = readText(update.supplier_variant_id)
    if (!supplierVariantId) return sendError(res, 400, "VALIDATION_ERROR", "supplier_variant_id is required")
    const hasOverride = Object.prototype.hasOwnProperty.call(update, "price_override")
    const priceOverride = hasOverride ? readNumber(update.price_override) : undefined
    if (hasOverride && update.price_override !== null && priceOverride === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "price_override must be a positive number or null")
    }
    if (priceOverride !== undefined && priceOverride !== null && priceOverride <= 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "price_override must be greater than zero")
    }
    if (update.enabled !== undefined && typeof update.enabled !== "boolean") {
      return sendError(res, 400, "VALIDATION_ERROR", "enabled must be a boolean")
    }
    normalized.push({ supplier_variant_id: supplierVariantId, ...(hasOverride ? { price_override: priceOverride } : {}), ...(typeof update.enabled === "boolean" ? { enabled: update.enabled } : {}) })
  }

  const service = getStoreCoreService(req) as any
  const products = await service.listProducts({ id: productId, store_id: storeId })
  const product = products[0] as Record<string, unknown> | undefined
  if (!product) return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  const known = new Set(normalizeProductSkus(product.variants).map((variant) => variant.supplier_variant_id))
  if (normalized.some((update) => !known.has(update.supplier_variant_id))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Each SKU must belong to the selected product")
  }
  const variants = applySkuUpdates(product.variants, normalized)
  const updatedRows = await service.updateProducts({ selector: { id: productId, store_id: storeId }, data: { variants } })
  let updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows

  if (updated?.status === "published") {
    const bridge = await resolveNativeBridgeForPublish(req.scope, updated as Record<string, unknown>, storeId)
    await ensureNativeBridgeCartable(req.scope, bridge)
    if (bridge.variantMappings?.length) {
      const mappings = new Map(bridge.variantMappings.map((mapping) => [mapping.supplier_variant_id, mapping.medusa_variant_id]))
      const mappedVariants = variants.map((variant) => mappings.has(variant.supplier_variant_id)
        ? { ...variant, medusa_variant_id: mappings.get(variant.supplier_variant_id) }
        : variant)
      const remapped = await service.updateProducts({ selector: { id: productId, store_id: storeId }, data: { variants: mappedVariants } })
      updated = Array.isArray(remapped) ? remapped[0] : remapped
    }
  }
  return res.json({ product_id: productId, store_id: storeId, updated_count: normalized.length, variants: updated?.variants ?? variants })
}
