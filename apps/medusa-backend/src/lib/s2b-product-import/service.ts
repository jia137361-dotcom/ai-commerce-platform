import type { MedusaContainer } from "@medusajs/framework/types"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import { syncBasicProduct } from "../../modules/suppliers/services/supplier-sync-service"
import { createMcProduct, normalizeProduct } from "../../api/_helpers/store-core"
import { listMarketRegionSummaries, resolveRegionIdForCountry } from "../product-regions"
import { normalizeShipFromCountryCode } from "../ship-from-country"
import { parseCsv, rowsToCsv, type S2bImportCsvRow } from "./csv"

export type S2bImportPreviewRow = {
  row_number: number
  source_product_id: string
  source_variant_id: string
  supplier_sku: string
  publish_action: string
  valid: boolean
  errors: string[]
}

export type S2bImportPreview = {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  rows: S2bImportPreviewRow[]
}

const DEFAULT_SUPPLIER_ID = "sup_s2bdiy"
const DEFAULT_SELLABLE_COUNTRIES = ["US", "AU", "CA"]
const BLOCKED_COUNTRIES = new Set(["CU", "IR", "KP", "SY"])
const KNOWN_COUNTRIES = new Set([
  "US", "AU", "CA", "GB", "DE", "FR", "IT", "JP", "SG", "CN", "NZ", "ES", "NL", "SE",
  "NO", "DK", "FI", "IE", "BE", "CH", "AT", "PT", "MX", "BR", "KR", "HK", "TW",
])
const VALID_ACTIONS = new Set(["draft", "publish", "skip"])

const clean = (value: unknown) => String(value ?? "").trim()
const lower = (value: unknown) => clean(value).toLowerCase()
const upper = (value: unknown) => clean(value).toUpperCase()

const parseList = (value: string) =>
  value
    .split(/[|;,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)

const parseImageUrls = (value: string) => {
  const raw = clean(value)
  if (!raw) return []
  if (raw.includes("|")) return raw.split("|").map((entry) => entry.trim()).filter(Boolean)
  if (raw.includes("\n")) return raw.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)
  const commaParts = raw.split(",").map((entry) => entry.trim()).filter(Boolean)
  if (commaParts.length > 1 && commaParts.every((entry) => /^https?:\/\//i.test(entry))) {
    return commaParts
  }
  return [raw]
}

const numeric = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "uncategorized"

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readImages(product: Record<string, unknown>, variant?: Record<string, unknown>) {
  const images = new Set<string>()
  for (const raw of [product.product_show_master_image, product.supplier_mockup_image_url]) {
    const value = clean(raw)
    if (value) images.add(value)
  }
  const productRaw = readRecord(product.raw_json)
  const variantRaw = readRecord(variant?.raw_json)
  for (const raw of [
    productRaw.view_image_src,
    productRaw.blank_design_image,
    productRaw.product_show_master_image,
    variantRaw.image,
    variantRaw.image_url,
  ]) {
    const value = clean(raw)
    if (value) images.add(value)
  }
  return [...images]
}

function validateImageUrls(raw: string) {
  const urls = parseImageUrls(raw)
  if (!urls.length) return ["image_urls is required"]
  return urls.flatMap((url) => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? []
        : [`image URL must be http(s): ${url}`]
    } catch {
      return [`invalid image URL: ${url}`]
    }
  })
}

function validateCountries(raw: string, allowedCountries: Set<string>) {
  const countries = parseList(raw).map((code) => code.toUpperCase())
  if (!countries.length) return ["sellable_country_codes is required"]
  const errors: string[] = []
  for (const code of countries) {
    if (!/^[A-Z]{2}$/.test(code)) errors.push(`invalid ISO country code: ${code}`)
    if (!KNOWN_COUNTRIES.has(code)) errors.push(`unknown country code: ${code}`)
    if (BLOCKED_COUNTRIES.has(code)) errors.push(`country is blocked for publishing: ${code}`)
    if (allowedCountries.size && !allowedCountries.has(code.toLowerCase())) {
      errors.push(`country is not configured in local market regions: ${code}`)
    }
  }
  return errors
}

async function ensureCategory(
  storeCore: StoreCoreModuleService,
  storeId: string,
  name: string,
  level: number,
  parentId?: string | null
) {
  const normalized = clean(name)
  if (!normalized) return null
  const existing = await storeCore.listProductCategories({ store_id: storeId } as never)
  const slug = slugify(parentId ? `${parentId}-${normalized}` : normalized)
  const match = (existing as Array<Record<string, unknown>>).find((category) =>
    clean(category.slug) === slug || (
      lower(category.name) === normalized.toLowerCase() &&
      clean(category.parent_id) === clean(parentId)
    )
  )
  if (match?.id) return clean(match.id)
  const created = await storeCore.createProductCategories({
    store_id: storeId,
    name: normalized,
    slug,
    parent_id: parentId ?? null,
    level,
    description: null,
  } as never)
  return clean((created as Record<string, unknown>).id)
}

export async function buildS2bExportCsv(input: {
  container: MedusaContainer
  storeId: string
  sourceProductIds: string[]
  supplierId?: string
}) {
  const supplierId = input.supplierId ?? DEFAULT_SUPPLIER_ID
  const storeCore = input.container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows: Array<Record<string, unknown>> = []

  for (const sourceId of [...new Set(input.sourceProductIds.map(clean).filter(Boolean))]) {
    await syncBasicProduct(Number(sourceId), supplierId, {
      storeCoreService: storeCore,
      storeId: input.storeId,
    })
    const products = await storeCore.listSupplierProducts({
      supplier_id: supplierId,
      basic_product_id: sourceId,
    } as never)
    const product = products[0] as Record<string, unknown> | undefined
    if (!product) continue
    const variants = await storeCore.listSupplierProductVariants({
      supplier_product_id: clean(product.id),
    } as never)
    const category = clean(product.category) || "Uncategorized"
    const warehouse = clean(product.warehouse_name) || clean(product.produce_country) || "CN"
    const images = readImages(product)
    for (const variant of variants as Array<Record<string, unknown>>) {
      const variantImages = readImages(product, variant)
      rows.push({
        source: "s2bdiy",
        source_product_id: sourceId,
        source_variant_id: clean(variant.supplier_variant_id),
        supplier_sku: clean(variant.sku),
        seller_title: clean(product.basic_product_en_name) || clean(product.name),
        seller_description: clean(product.basic_product_name) || clean(product.name),
        category_level_1: category,
        category_level_2: "",
        product_type: clean(product.basic_product_en_name) || clean(product.name),
        design: "Blank",
        color: clean(variant.color_name) || clean(variant.color) || "Default",
        size: clean(variant.size_name) || clean(variant.size) || "Default",
        weight: clean(variant.weight),
        cost: clean(variant.cost) || clean(product.base_cost),
        selling_price: Math.max(1, Number(variant.cost ?? product.base_cost ?? 0) * 2.3).toFixed(2),
        currency: clean(product.currency) || "usd",
        warehouse_region: warehouse,
        sellable_country_codes: DEFAULT_SELLABLE_COUNTRIES.join("|"),
        image_urls: (variantImages.length ? variantImages : images).join("|"),
        publish_action: "draft",
      })
    }
  }

  return rowsToCsv(rows)
}

async function validateRows(input: {
  container: MedusaContainer
  storeId: string
  rows: S2bImportCsvRow[]
}) {
  const storeCore = input.container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const regions = await listMarketRegionSummaries(input.container)
  const allowedCountries = new Set(regions.flatMap((region) => region.country_codes))
  const seenVariants = new Set<string>()
  const seenSkus = new Set<string>()
  const seenCombosByProduct = new Map<string, Set<string>>()
  const currencyByProduct = new Map<string, string>()

  const previews: S2bImportPreviewRow[] = []
  for (let index = 0; index < input.rows.length; index += 1) {
    const row = input.rows[index]
    const rowNumber = index + 2
    const errors: string[] = []
    const source = lower(row.source)
    const sourceProductId = clean(row.source_product_id)
    const sourceVariantId = clean(row.source_variant_id)
    const sku = clean(row.supplier_sku)
    const action = lower(row.publish_action) || "draft"
    const currency = lower(row.currency) || "usd"
    const combo = [lower(row.design) || "blank", lower(row.color) || "default", lower(row.size) || "default"].join("|")

    if (source !== "s2bdiy") errors.push("source must be s2bdiy")
    if (!sourceProductId) errors.push("source_product_id is required")
    if (!sourceVariantId) errors.push("source_variant_id is required")
    if (!sku) errors.push("supplier_sku is required")
    if (!clean(row.seller_title)) errors.push("seller_title is required")
    if (!clean(row.category_level_1)) errors.push("category_level_1 is required")
    if (!clean(row.product_type)) errors.push("product_type is required")
    if (!clean(row.warehouse_region)) errors.push("warehouse_region is required")
    if (!VALID_ACTIONS.has(action)) errors.push("publish_action must be draft, publish, or skip")

    const price = numeric(row.selling_price)
    if (price == null || price <= 0) errors.push("selling_price must be a positive number")
    const cost = numeric(row.cost)
    if (cost == null || cost < 0) errors.push("cost must be a non-negative number")
    const weight = numeric(row.weight)
    if (clean(row.weight) && (weight == null || weight < 0)) errors.push("weight must be a non-negative number")
    if (!/^[a-z]{3}$/.test(currency)) errors.push("currency must be a 3-letter code")

    const variantKey = `${source}:${sourceVariantId}`
    const skuKey = `${source}:${sku.toLowerCase()}`
    if (seenVariants.has(variantKey)) errors.push(`duplicate source_variant_id in CSV: ${sourceVariantId}`)
    if (seenSkus.has(skuKey)) errors.push(`duplicate supplier_sku in CSV: ${sku}`)
    seenVariants.add(variantKey)
    seenSkus.add(skuKey)

    const expectedCurrency = currencyByProduct.get(sourceProductId)
    if (expectedCurrency && expectedCurrency !== currency) errors.push("all rows for the same product must use one currency")
    if (!expectedCurrency) currencyByProduct.set(sourceProductId, currency)

    const combos = seenCombosByProduct.get(sourceProductId) ?? new Set<string>()
    if (combos.has(combo)) errors.push("duplicate design/color/size combination for this product")
    combos.add(combo)
    seenCombosByProduct.set(sourceProductId, combos)

    errors.push(...validateCountries(row.sellable_country_codes, allowedCountries))
    errors.push(...validateImageUrls(row.image_urls))

    const products = sourceProductId
      ? await storeCore.listSupplierProducts({
          supplier_id: DEFAULT_SUPPLIER_ID,
          basic_product_id: sourceProductId,
        } as never)
      : []
    const product = products[0] as Record<string, unknown> | undefined
    if (!product) {
      errors.push(`source_product_id does not exist locally: ${sourceProductId}`)
    } else {
      const variants = await storeCore.listSupplierProductVariants({
        supplier_product_id: clean(product.id),
      } as never)
      const match = (variants as Array<Record<string, unknown>>).find((variant) =>
        clean(variant.supplier_variant_id) === sourceVariantId
      )
      if (!match) errors.push(`source_variant_id does not exist for product: ${sourceVariantId}`)
      else if (sku && clean(match.sku) !== sku) errors.push(`supplier_sku does not match source variant: ${sku}`)
    }

    previews.push({
      row_number: rowNumber,
      source_product_id: sourceProductId,
      source_variant_id: sourceVariantId,
      supplier_sku: sku,
      publish_action: action,
      valid: errors.length === 0,
      errors,
    })
  }

  return previews
}

export async function previewS2bImport(input: {
  container: MedusaContainer
  storeId: string
  csv: string
}): Promise<S2bImportPreview> {
  const rows = parseCsv(input.csv)
  const previews = await validateRows({ ...input, rows })
  return {
    total_rows: previews.length,
    valid_rows: previews.filter((row) => row.valid).length,
    invalid_rows: previews.filter((row) => !row.valid).length,
    rows: previews,
  }
}

export async function importS2bDrafts(input: {
  container: MedusaContainer
  storeId: string
  csv: string
}) {
  const storeCore = input.container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows = parseCsv(input.csv)
  const previews = await validateRows({ ...input, rows })
  const validLineNumbers = new Set(previews.filter((row) => row.valid).map((row) => row.row_number))
  const imported: string[] = []
  const skipped: number[] = []

  const grouped = new Map<string, S2bImportCsvRow[]>()
  rows.forEach((row, index) => {
    if (!validLineNumbers.has(index + 2)) return
    if ((lower(row.publish_action) || "draft") === "skip") {
      skipped.push(index + 2)
      return
    }
    const key = clean(row.source_product_id)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  })

  const regions = await listMarketRegionSummaries(input.container)
  for (const [sourceProductId, productRows] of grouped) {
    const first = productRows[0]
    const supplierProducts = await storeCore.listSupplierProducts({
      supplier_id: DEFAULT_SUPPLIER_ID,
      basic_product_id: sourceProductId,
    } as never)
    const supplierProduct = supplierProducts[0] as Record<string, unknown> | undefined
    if (!supplierProduct) continue
    const supplierVariants = await storeCore.listSupplierProductVariants({
      supplier_product_id: clean(supplierProduct.id),
    } as never)
    const supplierByVariant = new Map(
      (supplierVariants as Array<Record<string, unknown>>).map((variant) => [clean(variant.supplier_variant_id), variant])
    )

    const category1 = await ensureCategory(storeCore, input.storeId, first.category_level_1, 1)
    const category2 = first.category_level_2
      ? await ensureCategory(storeCore, input.storeId, first.category_level_2, 2, category1)
      : null
    const countries = [...new Set(productRows.flatMap((row) => parseList(row.sellable_country_codes).map((code) => code.toUpperCase())))]
    const supportedRegionIds = [...new Set(countries.flatMap((code) => {
      const id = resolveRegionIdForCountry(regions, code)
      return id ? [id] : []
    }))]
    const imageUrls = [...new Set(productRows.flatMap((row) => parseImageUrls(row.image_urls)))]
    const publishAction = productRows.some((row) => lower(row.publish_action) === "publish") ? "publish" : "draft"
    const existing = (await storeCore.listProducts({
      store_id: input.storeId,
      supplier_id: DEFAULT_SUPPLIER_ID,
      basic_product_id: sourceProductId,
    } as never)) as Array<Record<string, unknown>>
    const current = existing[0]
    const currentMeta = readRecord(current?.metadata)
    const isPublished = clean(current?.status) === "published"

    const incomingVariants = productRows.map((row) => {
      const supplierVariant = supplierByVariant.get(clean(row.source_variant_id)) ?? {}
      const currentVariant = Array.isArray(current?.variants)
        ? (current.variants as Array<Record<string, unknown>>).find((variant) =>
            clean(variant.supplier_variant_id) === clean(row.source_variant_id)
          )
        : undefined
      return {
        supplier_variant_id: clean(row.source_variant_id),
        supplier_sku: clean(row.supplier_sku),
        seller_sku: clean(row.supplier_sku),
        design: clean(row.design) || "Blank",
        color: clean(row.color) || "Default",
        size: clean(row.size) || "Default",
        weight: numeric(row.weight) ?? numeric(clean(supplierVariant.weight)) ?? null,
        cost: numeric(row.cost) ?? numeric(clean(supplierVariant.cost)) ?? 0,
        price: isPublished && typeof currentVariant?.price === "number"
          ? currentVariant.price
          : numeric(row.selling_price) ?? 0,
        currency: lower(row.currency) || "usd",
        warehouse_region: clean(row.warehouse_region),
        image_url: parseImageUrls(row.image_urls)[0] ?? null,
        enabled: true,
        source_product_id: sourceProductId,
        source_variant_id: clean(row.source_variant_id),
        stock: clean(supplierVariant.stock_status) === "out_of_stock" ? 0 : 999,
      }
    })
    const incomingVariantIds = new Set(incomingVariants.map((variant) => variant.supplier_variant_id))
    const retainedVariants = Array.isArray(current?.variants)
      ? (current.variants as Array<Record<string, unknown>>).filter((variant) => {
          const supplierVariantId = clean(variant.supplier_variant_id)
          return supplierVariantId && !incomingVariantIds.has(supplierVariantId)
        })
      : []
    const variants = [...retainedVariants, ...incomingVariants]
    const metadata = {
      ...currentMeta,
      import_source: "s2bdiy_csv",
      import_status: "draft",
      import_publish_action: publishAction,
      category_level_1: clean(first.category_level_1),
      category_level_2: clean(first.category_level_2),
      product_type: clean(first.product_type),
      warehouse_region: clean(first.warehouse_region),
      sellable_country_codes: countries,
      supported_region_ids: supportedRegionIds,
      source_product_id: sourceProductId,
      image_urls: imageUrls,
    }
    const data = {
      store_id: input.storeId,
      title: isPublished ? clean(current.title) : clean(first.seller_title),
      description: isPublished ? clean(current.description) : clean(first.seller_description),
      status: current?.status ?? "draft",
      source: "manual",
      supplier_id: DEFAULT_SUPPLIER_ID,
      basic_product_id: sourceProductId,
      supplier_product_id: clean(supplierProduct.id),
      image_url: imageUrls[0] ?? clean(supplierProduct.product_show_master_image) ?? null,
      mockup_image_url: imageUrls[0] ?? null,
      price: isPublished && typeof current?.price === "number" ? current.price : numeric(first.selling_price),
      cost: numeric(first.cost) ?? numeric(clean(supplierProduct.base_cost)),
      category_ids: [category2, category1].filter(Boolean),
      ship_from_country: normalizeShipFromCountryCode(first.warehouse_region),
      variants,
      metadata,
    }

    let product
    if (current?.id) {
      product = await storeCore.updateProducts({
        selector: { id: clean(current.id), store_id: input.storeId },
        data,
      } as never)
      product = Array.isArray(product) ? product[0] : product
    } else {
      product = await createMcProduct(storeCore, data)
    }
    if (product?.id) imported.push(clean(product.id))
  }

  return {
    imported_product_ids: [...new Set(imported)],
    skipped_rows: skipped,
    preview: {
      total_rows: previews.length,
      valid_rows: previews.filter((row) => row.valid).length,
      invalid_rows: previews.filter((row) => !row.valid).length,
      rows: previews,
    },
  }
}

export async function listImportedDrafts(input: {
  container: MedusaContainer
  storeId: string
  filters: Record<string, unknown>
}) {
  const storeCore = input.container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const rows = (await storeCore.listProducts({
    store_id: input.storeId,
    supplier_id: DEFAULT_SUPPLIER_ID,
  } as never)) as Array<Record<string, unknown>>

  const filtered = rows.filter((product) => {
    const meta = readRecord(product.metadata)
    if (meta.import_source !== "s2bdiy_csv" && meta.import_source !== "s2bdiy_supplier") return false
    const status = clean(input.filters.status)
    if (status && status !== "all") {
      const computed = meta.import_status === "failed" ? "failed" : clean(product.status)
      if (computed !== status) return false
    }
    const category = lower(input.filters.category)
    if (category && ![meta.category_level_1, meta.category_level_2].some((value) => lower(value) === category)) return false
    const productType = lower(input.filters.product_type)
    if (productType && lower(meta.product_type) !== productType) return false
    const warehouse = lower(input.filters.warehouse_region)
    if (warehouse && lower(meta.warehouse_region) !== warehouse) return false
    const country = upper(input.filters.country)
    if (country && !(Array.isArray(meta.sellable_country_codes) && meta.sellable_country_codes.map(upper).includes(country))) return false
    return true
  })

  return {
    products: filtered.map(normalizeProduct),
    count: filtered.length,
  }
}
