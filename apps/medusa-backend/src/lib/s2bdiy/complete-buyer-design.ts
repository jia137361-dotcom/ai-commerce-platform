/**
 * Persist a buyer Studio design (S2B designed product) into My Design + cartable variants.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { getS2bdiyConfig } from "../../modules/suppliers/s2bdiy/config"
import {
  getProductDetail,
  extractMockupImageUrl,
  listDesignedProducts,
} from "../../modules/suppliers/s2bdiy/s2bdiy-product"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import { resolveNativeBridgeForPublish } from "../native-product-bridge"
import { ensureNativeBridgeCartable } from "../ensure-native-bridge-cartable"
import {
  ensureNativeProductShippingProfile,
  resolveProductRequiresShipping,
} from "../product-shipping"
import { readString } from "../product-cart-bridge"
import { createMcProduct } from "../../api/_helpers/store-core"
import { resolveBuyerDesignPriceFromS2b } from "./resolve-buyer-design-price"

const DEFAULT_BUYER_DESIGN_PRICE = 29.99

function resolveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

type OptionRow = {
  sizeId: number
  colorId: number
  sizeName: string
  colorName: string
  price?: number | null
}

function extractDesignOptions(
  productDetail: Record<string, unknown>,
  body: { size_id?: number | string; color_id?: number | string }
) {
  const variants = Array.isArray(productDetail.variants) ? productDetail.variants : []
  const items = Array.isArray(productDetail.items) ? productDetail.items : []
  const sizesRaw = Array.isArray(productDetail.sizes) ? productDetail.sizes : []
  const colorsRaw = Array.isArray(productDetail.colors) ? productDetail.colors : []

  const sizeNameById = new Map<number, string>()
  const colorNameById = new Map<number, string>()
  for (const row of sizesRaw) {
    if (!row || typeof row !== "object") continue
    const id = resolveNumber((row as Record<string, unknown>).id)
    const name =
      readString((row as Record<string, unknown>).name) ||
      readString((row as Record<string, unknown>).en_name)
    if (id && name) sizeNameById.set(id, name)
  }
  for (const row of colorsRaw) {
    if (!row || typeof row !== "object") continue
    const id = resolveNumber((row as Record<string, unknown>).id)
    const name =
      readString((row as Record<string, unknown>).name) ||
      readString((row as Record<string, unknown>).en_name)
    if (id && name) colorNameById.set(id, name)
  }

  const source = (variants.length ? variants : items) as Array<Record<string, unknown>>
  const optionRows: OptionRow[] = []
  for (const row of source) {
    if (!row || typeof row !== "object") continue
    const sizeId = resolveNumber(row.size_id)
    const colorId = resolveNumber(row.color_id)
    if (!sizeId || !colorId) continue
    const sizeName = readString(row.size_name) || sizeNameById.get(sizeId) || `Size ${sizeId}`
    const colorName = readString(row.color_name) || colorNameById.get(colorId) || `Color ${colorId}`
    optionRows.push({
      sizeId,
      colorId,
      sizeName,
      colorName,
      price: resolveNumber(row.price),
    })
    sizeNameById.set(sizeId, sizeName)
    colorNameById.set(colorId, colorName)
  }

  if (!optionRows.length && sizeNameById.size && colorNameById.size) {
    for (const [sizeId, sizeName] of sizeNameById) {
      for (const [colorId, colorName] of colorNameById) {
        optionRows.push({ sizeId, colorId, sizeName, colorName })
      }
    }
  }

  const bodySizeId = resolveNumber(body.size_id)
  const bodyColorId = resolveNumber(body.color_id)
  const envSizeId = resolveNumber(process.env.S2BDIY_TEST_SIZE_ID)
  const envColorId = resolveNumber(process.env.S2BDIY_TEST_COLOR_ID)

  if (!optionRows.length && envSizeId && envColorId) {
    optionRows.push({
      sizeId: envSizeId,
      colorId: envColorId,
      sizeName: "Default",
      colorName: "Default",
    })
  }

  const preferred =
    optionRows.find((row) => row.sizeId === bodySizeId && row.colorId === bodyColorId) ||
    optionRows.find((row) => row.sizeId === bodySizeId) ||
    optionRows.find((row) => row.colorId === bodyColorId) ||
    optionRows[0]

  const purchasePrice =
    resolveNumber(productDetail.purchase_price) ||
    resolveNumber(productDetail.price) ||
    preferred?.price ||
    null

  const sizes = [...sizeNameById.entries()].map(([id, name]) => ({ id, name }))
  const colors = [...colorNameById.entries()].map(([id, name]) => ({ id, name }))

  const seen = new Set<string>()
  const uniqueRows = optionRows.filter((row) => {
    const key = `${row.sizeId}:${row.colorId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    sizes: sizes.length
      ? sizes
      : uniqueRows.length
        ? [...new Map(uniqueRows.map((row) => [row.sizeId, { id: row.sizeId, name: row.sizeName }])).values()]
        : [],
    colors: colors.length
      ? colors
      : uniqueRows.length
        ? [
            ...new Map(
              uniqueRows.map((row) => [row.colorId, { id: row.colorId, name: row.colorName }])
            ).values(),
          ]
        : [],
    rows: uniqueRows,
    preferred,
    purchasePrice,
  }
}

export type CompleteBuyerDesignInput = {
  storeId: string
  s2bProductId: string | number
  basicProductId: string | number
  sizeId?: number | string | null
  colorId?: number | string | null
  price?: number | null
  mockupUrl?: string | null
  saveAs?: "draft" | "ready"
  blankProductId?: string | null
  guestKey?: string | null
  customerId?: string | null
}

export type CompleteBuyerDesignResult = {
  mc_product_id: string
  medusa_variant_id: string
  medusa_product_id: string
  title: string
  mockup_url: string | null
  price: number
  supplier_product_id: string
  supplier_size_id: string
  supplier_color_id: string
  basic_product_id: string
  blank_product_id: string | null
  status: string
  save_as: "draft" | "ready"
  editor_path: string
  sizes: Array<{ id: number; name: string }>
  colors: Array<{ id: number; name: string }>
  variants: Array<{
    size_id: number
    color_id: number
    size_name: string
    color_name: string
    supplier_variant_id: string
    medusa_variant_id: string | null
  }>
  selected_size_id: number
  selected_color_id: number
}

export async function completeBuyerDesignSession(
  container: MedusaContainer,
  input: CompleteBuyerDesignInput
): Promise<CompleteBuyerDesignResult> {
  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) {
    throw new Error("Design service is not configured")
  }

  const saveAs = input.saveAs === "ready" ? "ready" : "draft"
  const s2bProductId = String(input.s2bProductId)
  const basicProductId = String(input.basicProductId)
  const storeId = input.storeId
  const blankProductId = input.blankProductId ?? null
  const customerId = input.customerId ?? null
  // Logged-in saves must not keep a browser guest_key, or the same guest can re-list them after logout.
  const guestKey = customerId ? null : input.guestKey ?? null

  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const client = new S2bdiyClient(s2bConfig)
  const productDetail = await getProductDetail(client, s2bProductId)
  const mockupUrl =
    (typeof input.mockupUrl === "string" && input.mockupUrl.trim()) ||
    extractMockupImageUrl(productDetail)
  const productName =
    (typeof productDetail.product_name === "string" && productDetail.product_name.trim()) ||
    "Custom Design"

  const options = extractDesignOptions(productDetail, {
    size_id: input.sizeId ?? undefined,
    color_id: input.colorId ?? undefined,
  })
  if (!options.preferred) {
    throw new Error("Unable to resolve size/color options for the designed product")
  }

  const preferred = options.preferred
  const s2bCost = await resolveBuyerDesignPriceFromS2b(client, {
    basicProductId,
    sizeId: preferred.sizeId,
    colorId: preferred.colorId,
  })
  const price =
    resolveNumber(input.price) ??
    s2bCost?.retailPriceUsd ??
    resolveNumber(process.env.BUYER_CUSTOM_DESIGN_PRICE) ??
    DEFAULT_BUYER_DESIGN_PRICE
  const costCny = s2bCost?.purchasePriceCny ?? options.purchasePrice ?? 0

  const variantRows = options.rows.map((row) => ({
    supplier_variant_id: `${s2bProductId}_${row.sizeId}_${row.colorId}`,
    supplier_size_id: String(row.sizeId),
    supplier_color_id: String(row.colorId),
    color: row.colorName,
    size: row.sizeName,
    price,
    stock: 50,
  }))

  const preferredSupplierVariantId = `${s2bProductId}_${preferred.sizeId}_${preferred.colorId}`

  const mcProduct = await createMcProduct(storeCoreService, {
    store_id: storeId,
    title: productName,
    description: "Custom design created in Studio",
    status: "draft",
    source: "manual",
    basic_product_id: basicProductId,
    supplier_id: "sup_s2bdiy",
    supplier_product_id: s2bProductId,
    supplier_variant_id: preferredSupplierVariantId,
    supplier_size_id: String(preferred.sizeId),
    supplier_color_id: String(preferred.colorId),
    mockup_image_url: mockupUrl ?? undefined,
    image_url: mockupUrl ?? undefined,
    price,
    cost: costCny,
    tags: ["custom-design", "buyer-diy", "my-design"],
    variants: variantRows,
    category_ids: [],
    metadata: {
      s2b_product_id: s2bProductId,
      design_source: "buyer_sdk",
      buyer_design: true,
      s2b_sdk_saved: true,
      save_as: saveAs,
      customer_id: customerId,
      guest_key: guestKey,
      blank_product_id: blankProductId,
      size_name: preferred.sizeName,
      color_name: preferred.colorName,
      s2b_purchase_price_cny: s2bCost?.purchasePriceCny ?? null,
      price_source: s2bCost ? "s2b_basic_product" : "fallback",
    },
  })

  const bridge = await resolveNativeBridgeForPublish(
    container,
    mcProduct as Record<string, unknown>,
    storeId
  )
  await ensureNativeBridgeCartable(container, bridge)
  if (resolveProductRequiresShipping(mcProduct as Record<string, unknown>)) {
    await ensureNativeProductShippingProfile(container, bridge.medusaProductId)
  }

  const finalStatus = saveAs === "ready" ? "unpublished" : "draft"
  const mappings = new Map(
    (bridge.variantMappings ?? []).map((entry) => [
      entry.supplier_variant_id,
      entry.medusa_variant_id,
    ])
  )

  const updateData: Record<string, unknown> = {
    status: finalStatus,
    medusa_product_id: bridge.medusaProductId,
    medusa_variant_id: mappings.get(preferredSupplierVariantId) ?? bridge.medusaVariantId,
    metadata: {
      ...((mcProduct as { metadata?: Record<string, unknown> }).metadata ?? {}),
      s2b_product_id: s2bProductId,
      design_source: "buyer_sdk",
      buyer_design: true,
      s2b_sdk_saved: true,
      save_as: saveAs,
      customer_id: customerId,
      guest_key: guestKey,
      blank_product_id: blankProductId,
      size_name: preferred.sizeName,
      color_name: preferred.colorName,
      s2b_purchase_price_cny: s2bCost?.purchasePriceCny ?? null,
      price_source: s2bCost ? "s2b_basic_product" : "fallback",
    },
  }
  if (Array.isArray(mcProduct.variants)) {
    updateData.variants = (mcProduct.variants as unknown[]).map((value) => {
      if (!value || typeof value !== "object") return value
      const row = value as Record<string, unknown>
      const id = readString(row.supplier_variant_id)
      return id && mappings.has(id) ? { ...row, medusa_variant_id: mappings.get(id) } : row
    })
  }

  const updated = await storeCoreService.updateProducts({
    selector: { id: mcProduct.id, store_id: storeId },
    data: updateData,
  })
  const published = Array.isArray(updated) ? updated[0] : updated
  const defaultVariantId =
    readString(published?.medusa_variant_id) ??
    mappings.get(preferredSupplierVariantId) ??
    bridge.medusaVariantId

  return {
    mc_product_id: String(mcProduct.id),
    medusa_variant_id: String(defaultVariantId),
    medusa_product_id: bridge.medusaProductId,
    title: published?.title ?? productName,
    mockup_url: mockupUrl ?? null,
    price: published?.price ?? price,
    supplier_product_id: s2bProductId,
    supplier_size_id: String(preferred.sizeId),
    supplier_color_id: String(preferred.colorId),
    basic_product_id: basicProductId,
    blank_product_id: blankProductId,
    status: finalStatus,
    save_as: saveAs,
    editor_path: `/design/${encodeURIComponent(String(mcProduct.id))}`,
    sizes: options.sizes,
    colors: options.colors,
    variants: options.rows.map((row) => {
      const supplierVariantId = `${s2bProductId}_${row.sizeId}_${row.colorId}`
      return {
        size_id: row.sizeId,
        color_id: row.colorId,
        size_name: row.sizeName,
        color_name: row.colorName,
        supplier_variant_id: supplierVariantId,
        medusa_variant_id: mappings.get(supplierVariantId) ?? null,
      }
    }),
    selected_size_id: preferred.sizeId,
    selected_color_id: preferred.colorId,
  }
}

export async function findLatestDesignedProductId(input: {
  basicProductId: string | number
  excludeIds?: Array<string | number>
}): Promise<{ s2bProductId: string; mockupUrl: string | null; title: string | null } | null> {
  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) throw new Error("Design service is not configured")
  const client = new S2bdiyClient(s2bConfig)
  const basicId = String(input.basicProductId)
  const excluded = new Set((input.excludeIds ?? []).map((id) => String(id)))

  const rows = await listDesignedProducts(client, { page: 1, perPage: 40 })
  const matches = rows
    .map((row) => {
      const id = resolveNumber(row.id) ?? resolveNumber(row.product_id)
      const basic =
        resolveNumber(row.basic_product_id) ??
        resolveNumber((row.product_design as Record<string, unknown> | undefined)?.basic_product_id)
      return { row, id, basic }
    })
    .filter((entry) => entry.id && String(entry.basic ?? "") === basicId)
    .filter((entry) => !excluded.has(String(entry.id)))
    .sort((a, b) => Number(b.id) - Number(a.id))

  const best = matches[0]
  if (!best?.id) return null

  const mockup =
    extractMockupImageUrl(best.row) ||
    readString(best.row.product_show_master_image) ||
    readString(best.row.image) ||
    null
  const title =
    readString(best.row.product_name) ||
    readString(best.row.name) ||
    readString(best.row.en_name) ||
    null

  return { s2bProductId: String(best.id), mockupUrl: mockup, title }
}
