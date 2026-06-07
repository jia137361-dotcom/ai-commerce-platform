import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import { execSync } from "node:child_process"
import { S2bdiyClient } from "../modules/suppliers/s2bdiy/s2bdiy-client"
import { getS2bdiyAccessToken } from "../modules/suppliers/s2bdiy/s2bdiy-auth"
import {
  extractMockupImageUrl,
  getBasicProductDetail,
  getProductDetail,
  listBasicProducts,
  quickCreateProduct,
} from "../modules/suppliers/s2bdiy/s2bdiy-product"
import { uploadMaterialClient } from "../modules/suppliers/s2bdiy/s2bdiy-material"
import {
  calculateLogisticsClient,
  resolveLogisticsPlatformId,
} from "../modules/suppliers/s2bdiy/s2bdiy-logistics"
import {
  buildDefaultS2bAddress,
  createOrderClient,
  extractSupplierOrderId,
  getOrderDetailClient,
  listS2bStores,
  resolveS2bStoreId,
} from "../modules/suppliers/s2bdiy/s2bdiy-order"

type PhaseResult = "PASS" | "FAIL" | "BLOCKED" | "SKIPPED"

type StepRecord = {
  phase: string
  name: string
  result: PhaseResult
  notes: string
  rawPath?: string
  maskedPath?: string
}

type Selection = {
  product: Record<string, unknown> | null
  detail: Record<string, unknown> | null
  fallbackUsed: boolean
  color: Record<string, unknown> | null
  size: Record<string, unknown> | null
  view: Record<string, unknown> | null
  printArea: Record<string, unknown> | null
  item: Record<string, unknown> | null
}

const repoRoot = path.resolve(__dirname, "../../../..")
const logDir = path.resolve(repoRoot, process.env.SUPPLIER_LOG_DIR ?? `logs/supplier-single-store-${timestamp()}`)
const rawDir = path.join(logDir, "raw")
const maskedDir = path.join(logDir, "masked")
const assetsDir = path.join(logDir, "assets")
const commandsDir = path.join(logDir, "commands")

for (const dir of [logDir, rawDir, maskedDir, assetsDir, commandsDir]) {
  fs.mkdirSync(dir, { recursive: true })
}

const steps: StepRecord[] = []
const state: Record<string, unknown> = {
  payment_status: "PAYMENT_SKIPPED_BY_DEFAULT",
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback
}

function mask(value: string | undefined | null): string {
  if (!value) return "missing"
  if (value.length <= 6) return `${value.slice(0, 1)}***${value.slice(-1)}`
  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

function classifyBaseUrl(baseUrl: string): string {
  if (!baseUrl) return "missing"
  if (baseUrl.includes("opentest.s2bdiy.com")) return "sandbox/test likely"
  if (baseUrl.includes("openapi.s2bdiy.com")) return "production likely"
  return "unknown"
}

function writeJson(filePath: string, value: unknown): string {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
  return filePath
}

function rawPath(name: string): string {
  return path.join(rawDir, name)
}

function maskedPath(name: string): string {
  return path.join(maskedDir, name)
}

function record(step: StepRecord): void {
  steps.push(step)
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return ""
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object") as Record<string, unknown>[]) : []
}

function dataList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return asArray(value)
  if (!value || typeof value !== "object") return []
  const obj = value as Record<string, unknown>
  if (Array.isArray(obj.data)) return asArray(obj.data)
  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>
    if (Array.isArray(nested.data)) return asArray(nested.data)
  }
  if (Array.isArray(obj.items)) return asArray(obj.items)
  if (Array.isArray(obj.records)) return asArray(obj.records)
  return []
}

function scoreBasicProduct(product: Record<string, unknown>): number {
  const text = `${safeString(product.name)} ${safeString(product.en_name)} ${safeString(product.code)}`.toLowerCase()
  const positive = ["t-shirt", "tshirt", "shirt", "tee", "服装", "t恤", "短袖", "上衣"]
  return positive.reduce((score, word) => score + (text.includes(word.toLowerCase()) ? 10 : 0), 0)
}

function pickNamed(list: Record<string, unknown>[], preferred: string[]): Record<string, unknown> | null {
  for (const term of preferred) {
    const lower = term.toLowerCase()
    const match = list.find((item) => {
      const text = `${safeString(item.name)} ${safeString(item.en_name)}`.toLowerCase()
      return text.includes(lower)
    })
    if (match) return match
  }
  return list[0] ?? null
}

function pickSelection(products: Record<string, unknown>[], detail: Record<string, unknown>): Selection {
  const ranked = [...products].sort((a, b) => scoreBasicProduct(b) - scoreBasicProduct(a))
  const product = ranked[0] ?? null
  const fallbackUsed = product ? scoreBasicProduct(product) <= 0 : true
  const colors = asArray(detail.colors)
  const sizes = asArray(detail.sizes)
  const views = asArray(detail.views)
  const printAreas = asArray(detail.print_areas)
  const items = asArray(detail.items)
  const color = pickNamed(colors, ["Black", "黑", "White", "白"])
  const size = pickNamed(sizes, ["M", "L", "S", "XL"])
  const view = pickNamed(views, ["Front", "正面", "A面", "View A"])
  const viewId = safeString(view?.id)
  const printArea = printAreas.find((area) => safeString(area.view_id) === viewId) ?? printAreas[0] ?? null
  const colorId = safeString(color?.id)
  const sizeId = safeString(size?.id)
  const item =
    items.find((candidate) => safeString(candidate.color_id) === colorId && safeString(candidate.size_id) === sizeId) ??
    items[0] ??
    null
  return { product, detail, fallbackUsed, color, size, view, printArea, item }
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const name = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

let crcTable: number[] | null = null
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, n) => {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      return c >>> 0
    })
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function generatePng(filePath: string, widthInput: unknown, heightInput: unknown): { width: number; height: number; bytes: number } {
  const width = Math.max(64, Math.min(3000, Math.round(Number(widthInput) || 1000)))
  const height = Math.max(64, Math.min(3000, Math.round(Number(heightInput) || 1000)))
  const rows: Buffer[] = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0
    for (let x = 0; x < width; x++) {
      const i = 1 + x * 4
      const nx = x / width
      const ny = y / height
      const frame = nx > 0.15 && nx < 0.85 && ny > 0.25 && ny < 0.75
      const border = frame && (nx < 0.18 || nx > 0.82 || ny < 0.28 || ny > 0.72)
      const stripe = nx > 0.28 && nx < 0.72 && ((ny > 0.4 && ny < 0.46) || (ny > 0.54 && ny < 0.6))
      if (border || stripe) {
        row[i] = 20
        row[i + 1] = 20
        row[i + 2] = 20
        row[i + 3] = 255
      }
    }
    rows.push(row)
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
  fs.writeFileSync(filePath, png)
  return { width, height, bytes: png.length }
}

function gitValue(command: string): string {
  try {
    return execSync(command, { cwd: repoRoot, encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

function writeReport(): void {
  const phase = (name: string): StepRecord | undefined => steps.find((s) => s.phase === name)
  const p0 = phase("phase0_env_check")
  const p1 = phase("phase1_auth_and_product_generation")
  const p2 = phase("phase2_unpaid_order_pricing")
  const report = `# Single-store S2BDIY Supplier Dry-run Report

## 1. Environment

- branch: ${gitValue("git branch --show-current")}
- commit: ${gitValue("git rev-parse --short HEAD")}
- log_dir: ${path.relative(repoRoot, logDir)}
- base_url_masked: ${mask(env("S2BDIY_BASE_URL", env("S2BDIY_API_BASE_URL")))}
- environment_classification: ${classifyBaseUrl(env("S2BDIY_BASE_URL", env("S2BDIY_API_BASE_URL")))}
- app_key_masked: ${mask(env("S2BDIY_APP_KEY"))}
- app_secret: ${env("S2BDIY_APP_SECRET") ? "exists" : "missing"}
- S2BDIY_TEST_MODE: ${env("S2BDIY_TEST_MODE", "false")}
- SUPPLIER_ALLOW_PAYMENT: ${env("SUPPLIER_ALLOW_PAYMENT", "false")}
- HUMAN_APPROVED_PAYMENT: ${env("HUMAN_APPROVED_PAYMENT", "false")}
- S2BDIY_DRY_RUN_MAX_PHASE: ${env("S2BDIY_DRY_RUN_MAX_PHASE", "0")}
- S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE: ${env("S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE", "false")}

## 2. Safety Gates

- supplier_mutations_require_test_mode: ${env("S2BDIY_TEST_MODE", "false") === "true"}
- create_order_confirmed_no_charge: ${env("S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE", "false")}
- payment_allowed: false
- never_called: POST /open/v1/orderPay, POST /open/v1/order/{id}/logistics, POST /open/v1/childUser, POST /open/v1/store, POST /open/v1/product/{id}/copy, DELETE /open/v1/order/{id}

## 3. Overall Result

| Phase | Result | Notes |
|---|---|---|
| Phase 0 Env Check | ${p0?.result ?? "SKIPPED"} | ${p0?.notes ?? ""} |
| Phase 1 Product Generation | ${p1?.result ?? "SKIPPED"} | ${p1?.notes ?? "Not requested or blocked"} |
| Phase 2 Unpaid Order Pricing | ${p2?.result ?? "SKIPPED"} | ${p2?.notes ?? "Not requested or blocked"} |
| Phase 3 Payment | SKIPPED | PAYMENT_SKIPPED_BY_DEFAULT |

## 4. Selected Basic Product

- selected_basic_product_id: ${state.selected_basic_product_id ?? "SKIPPED"}
- selected_basic_product_name: ${state.selected_basic_product_name ?? "SKIPPED"}
- fallback_used: ${state.basic_product_fallback_used ?? "SKIPPED"}

## 5. Selected Variant / View

- selected_color_id: ${state.selected_color_id ?? "SKIPPED"}
- selected_color_name: ${state.selected_color_name ?? "SKIPPED"}
- selected_size_id: ${state.selected_size_id ?? "SKIPPED"}
- selected_size_name: ${state.selected_size_name ?? "SKIPPED"}
- selected_view_id: ${state.selected_view_id ?? "SKIPPED"}
- selected_view_name: ${state.selected_view_name ?? "SKIPPED"}

## 6. Material Upload

- supplier_asset_id: ${state.supplier_asset_id ?? "SKIPPED"}
- supplier_asset_url: ${state.supplier_asset_url ?? "SKIPPED"}
- local_png: ${state.local_png_path ?? "SKIPPED"}

## 7. Generated Supplier Product

- supplier_product_id: ${state.supplier_product_id ?? "SKIPPED"}
- supplier_product_name: ${state.supplier_product_name ?? "SKIPPED"}
- mockup_or_show_image_url: ${state.mockup_or_show_image_url ?? "SKIPPED"}

## 8. Logistics Quote

- logistics_platform_id: ${state.logistics_platform_id ?? "SKIPPED"}
- logistics_quote_amount: ${state.logistics_quote_amount ?? "SKIPPED"}
- logistics_quote_source: ${state.logistics_quote_source ?? "SKIPPED"}

## 9. Unpaid Order and Pricing

- supplier_order_id: ${state.supplier_order_id ?? "SKIPPED"}
- external_order_id: ${state.external_order_id ?? "SKIPPED"}
- product_amount: ${state.product_amount ?? "SKIPPED"}
- shipping_amount: ${state.shipping_amount ?? "SKIPPED"}
- discount_amount: ${state.discount_amount ?? "SKIPPED"}
- total_amount: ${state.total_amount ?? "SKIPPED"}
- currency: ${state.currency ?? "TODO_CONFIRM_WITH_SUPPLIER"}
- pay_status: ${state.pay_status ?? "SKIPPED"}
- pay_status_text: ${state.pay_status_text ?? "SKIPPED"}
- status: ${state.status ?? "SKIPPED"}
- status_text: ${state.status_text ?? "SKIPPED"}
- payment_status: PAYMENT_SKIPPED_BY_DEFAULT

## 10. Blockers

${steps.filter((s) => s.result === "BLOCKED" || s.result === "FAIL").map((s) => `- ${s.phase}/${s.name}: ${s.notes}`).join("\n") || "None recorded."}

## 11. Raw Response Files

${steps.map((s) => `- ${s.name}: ${s.rawPath ? path.relative(logDir, s.rawPath) : "SKIPPED"} (${s.result})`).join("\n")}

## 12. Next Actions

- Review raw responses before enabling the next phase.
- Keep payment skipped; this script never calls orderPay.
- Confirm Create Order no-charge behavior before Phase 2.
`
  fs.writeFileSync(path.join(logDir, "REPORT.md"), report)
}

async function main(): Promise<void> {
  const baseUrl = env("S2BDIY_BASE_URL", env("S2BDIY_API_BASE_URL")).replace(/\/$/, "")
  const config = {
    apiBaseUrl: baseUrl,
    appKey: env("S2BDIY_APP_KEY"),
    appSecret: env("S2BDIY_APP_SECRET"),
    platformId: Number(env("S2BDIY_PLATFORM_ID", "99")),
  }
  const maxPhase = Number(env("S2BDIY_DRY_RUN_MAX_PHASE", "0"))
  const envKind = classifyBaseUrl(baseUrl)
  record({ phase: "phase0_env_check", name: "env/safety", result: "PASS", notes: `Environment classified as ${envKind}` })

  if (!baseUrl || !config.appKey || !config.appSecret) {
    record({ phase: "phase0_env_check", name: "credentials", result: "BLOCKED", notes: "Missing S2BDIY_BASE_URL, S2BDIY_APP_KEY, or S2BDIY_APP_SECRET" })
    writeReport()
    process.exitCode = 2
    return
  }
  if (maxPhase < 1) {
    writeReport()
    return
  }
  if (env("S2BDIY_TEST_MODE", "false") !== "true") {
    record({ phase: "phase1_auth_and_product_generation", name: "test-mode", result: "BLOCKED", notes: "S2BDIY_TEST_MODE is not true; no supplier mutation allowed." })
    writeReport()
    process.exitCode = 2
    return
  }
  if (envKind !== "sandbox/test likely") {
    record({ phase: "phase1_auth_and_product_generation", name: "environment", result: "BLOCKED", notes: `Environment is ${envKind}; stop before supplier mutation.` })
    writeReport()
    process.exitCode = 2
    return
  }

  const client = new S2bdiyClient(config)

  try {
    const token = await getS2bdiyAccessToken(config)
    const accessTokenPath = writeJson(rawPath("access-token.json"), {
      data: { token: mask(token) },
      status: "success",
      note: "Token masked by dry-run script.",
    })
    record({ phase: "phase1_auth_and_product_generation", name: "accessToken", result: "PASS", notes: "Token obtained and masked.", rawPath: accessTokenPath })

    const categories = await client.request<unknown>("/open/v1/basicProduct/categorys", { method: "GET" })
    record({
      phase: "phase1_auth_and_product_generation",
      name: "basicProduct/categorys",
      result: "PASS",
      notes: "Categories fetched.",
      rawPath: writeJson(rawPath("basic-product-categorys.json"), categories),
    })

    const products = await listBasicProducts(client, { page: 1, per_page: 50 })
    record({
      phase: "phase1_auth_and_product_generation",
      name: "basicProduct",
      result: products.length > 0 ? "PASS" : "BLOCKED",
      notes: `${products.length} products fetched.`,
      rawPath: writeJson(rawPath("basic-products.json"), products),
    })
    if (!products.length) throw new Error("No basic products returned")

    const ranked = [...products].sort((a, b) => scoreBasicProduct(b) - scoreBasicProduct(a))
    const selectedProduct = ranked[0]
    const basicProductId = safeString(selectedProduct?.id)
    if (!basicProductId) throw new Error("Selected basic product missing id")

    const detail = await getBasicProductDetail(client, basicProductId)
    record({
      phase: "phase1_auth_and_product_generation",
      name: "basicProduct detail",
      result: "PASS",
      notes: `Detail fetched for basic product ${basicProductId}.`,
      rawPath: writeJson(rawPath("basic-product-detail.json"), detail),
    })

    const selection = pickSelection(products, detail)
    state.selected_basic_product_id = basicProductId
    state.selected_basic_product_name = safeString(selectedProduct?.name) || safeString(selectedProduct?.en_name)
    state.basic_product_fallback_used = selection.fallbackUsed
    state.selected_color_id = safeString(selection.color?.id)
    state.selected_color_name = safeString(selection.color?.name) || safeString(selection.color?.en_name)
    state.selected_size_id = safeString(selection.size?.id)
    state.selected_size_name = safeString(selection.size?.name) || safeString(selection.size?.en_name)
    state.selected_view_id = safeString(selection.view?.id) || safeString(selection.printArea?.view_id)
    state.selected_view_name = safeString(selection.view?.name) || safeString(selection.view?.en_name)
    state.selected_stock_sku_item_id = safeString(selection.item?.id)
    state.selected_variant_weight = safeString(selection.item?.weight)
    state.selected_variant_length = safeString(selection.item?.length)
    state.selected_variant_width = safeString(selection.item?.width)
    state.selected_variant_height = safeString(selection.item?.height)

    if (!state.selected_color_id || !state.selected_size_id || !state.selected_view_id) {
      throw new Error("Could not select color, size, or view from basic product detail")
    }

    const pngPath = path.join(assetsDir, "test-design.png")
    const png = generatePng(pngPath, selection.printArea?.width, selection.printArea?.height)
    state.local_png_path = path.relative(logDir, pngPath)
    record({ phase: "phase1_auth_and_product_generation", name: "generate PNG", result: "PASS", notes: `${png.width}x${png.height}, ${png.bytes} bytes.` })

    const material = await uploadMaterialClient(client, {
      buffer: fs.readFileSync(pngPath),
      filename: "test-design.png",
      name: "CitiGoo dry-run test material",
    })
    state.supplier_asset_id = String(material.id)
    state.supplier_asset_url = material.image_url ?? ""
    record({
      phase: "phase1_auth_and_product_generation",
      name: "uploadMaterial",
      result: "PASS",
      notes: `Material uploaded: ${material.id}`,
      rawPath: writeJson(rawPath("upload-material.json"), material),
    })

    const materialDetail = await client.request<unknown>(`/open/v1/material/${material.id}`, { method: "GET" })
    record({
      phase: "phase1_auth_and_product_generation",
      name: "material detail",
      result: "PASS",
      notes: "Material detail fetched.",
      rawPath: writeJson(rawPath("material-detail.json"), materialDetail),
    })

    const created = await quickCreateProduct(client, {
      basic_product_id: Number(basicProductId),
      size_id: Number(state.selected_size_id),
      color_id: Number(state.selected_color_id),
      view_id: Number(state.selected_view_id),
      material_id: material.id,
      name: `CitiGoo dry-run ${env("RUN_ID", timestamp())}`,
      design_type: 1,
    })
    state.supplier_product_id = String(created.product_id)
    state.supplier_product_name = created.product_name ?? ""
    record({
      phase: "phase1_auth_and_product_generation",
      name: "quickCreate",
      result: "PASS",
      notes: `Supplier product created: ${created.product_id}`,
      rawPath: writeJson(rawPath("create-product.json"), created),
    })

    const productDetail = await getProductDetail(client, created.product_id)
    state.mockup_or_show_image_url = extractMockupImageUrl(productDetail) ?? ""
    record({
      phase: "phase1_auth_and_product_generation",
      name: "product detail",
      result: "PASS",
      notes: "Generated product detail fetched.",
      rawPath: writeJson(rawPath("product-detail.json"), productDetail),
    })

    try {
      const productsById = await client.request<unknown>("/open/v1/product", { method: "GET", query: { ids: String(created.product_id) } })
      record({
        phase: "phase1_auth_and_product_generation",
        name: "products by id",
        result: "PASS",
        notes: "Generated product lookup fetched.",
        rawPath: writeJson(rawPath("products.json"), productsById),
      })
    } catch (error) {
      record({ phase: "phase1_auth_and_product_generation", name: "products by id", result: "FAIL", notes: error instanceof Error ? error.message : String(error) })
    }
  } catch (error) {
    record({ phase: "phase1_auth_and_product_generation", name: "phase1", result: "FAIL", notes: error instanceof Error ? error.message : String(error) })
    writeReport()
    process.exitCode = 1
    return
  }

  if (maxPhase < 2) {
    record({ phase: "phase2_unpaid_order_pricing", name: "phase2", result: "SKIPPED", notes: "S2BDIY_DRY_RUN_MAX_PHASE < 2" })
    writeReport()
    return
  }

  if (env("S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE", "false") !== "true") {
    record({ phase: "phase2_unpaid_order_pricing", name: "create order gate", result: "BLOCKED", notes: "S2BDIY_CREATE_ORDER_CONFIRMED_NO_CHARGE is not true; stopped before create order." })
    writeReport()
    process.exitCode = 2
    return
  }

  try {
    const shops = await listS2bStores(client)
    const shopsPath = writeJson(rawPath("shops.json"), shops)
    const storeId = resolveS2bStoreId(shops)
    record({ phase: "phase2_unpaid_order_pricing", name: "shops", result: storeId ? "PASS" : "BLOCKED", notes: storeId ? `Selected store ${storeId}` : "No supplier store id.", rawPath: shopsPath })
    if (!storeId) throw new Error("No supplier store id")

    const weight = Number(state.selected_variant_weight || env("S2BDIY_DEFAULT_WEIGHT", "225"))
    const length = Number(state.selected_variant_length || env("S2BDIY_DEFAULT_LENGTH", "20"))
    const width = Number(state.selected_variant_width || env("S2BDIY_DEFAULT_WIDTH", "20"))
    const height = Number(state.selected_variant_height || env("S2BDIY_DEFAULT_HEIGHT", "10"))
    const logistics = await calculateLogisticsClient(client, {
      basic_product_id: String(state.selected_basic_product_id),
      platform: config.platformId,
      num: 1,
      country: env("S2BDIY_ORDER_COUNTRY", "US"),
      province: env("S2BDIY_ORDER_PROVINCE", "CA"),
      postcode: env("S2BDIY_ORDER_POSTCODE", "90001"),
      weight,
      length,
      width,
      height,
    })
    const logisticsPath = writeJson(rawPath("logistics-calculation.json"), logistics)
    const logisticsId = resolveLogisticsPlatformId(logistics)
    state.logistics_platform_id = logisticsId ?? ""
    state.logistics_quote_amount = safeString(logistics[0]?.amount)
    state.logistics_quote_source = "GET /open/v1/logisticsCalculation"
    record({ phase: "phase2_unpaid_order_pricing", name: "logisticsCalculation", result: logisticsId ? "PASS" : "BLOCKED", notes: logisticsId ? `Selected logistics ${logisticsId}` : "No logistics option.", rawPath: logisticsPath })
    if (!logisticsId) throw new Error("No logistics option")

    try {
      const stockSkuId = safeString(state.selected_stock_sku_item_id)
      if (stockSkuId) {
        const calculateProducts = await client.request<unknown>("/open/v1/calculateProducts", {
          method: "GET",
          query: {
            "products[0][product_id]": String(state.supplier_product_id),
            "products[0][stock_sku_item_id]": stockSkuId,
            "products[0][num]": 1,
            platform: config.platformId,
            country: env("S2BDIY_ORDER_COUNTRY", "US"),
            province: env("S2BDIY_ORDER_PROVINCE", "CA"),
            city: env("S2BDIY_ORDER_CITY", "Los Angeles"),
            postcode: env("S2BDIY_ORDER_POSTCODE", "90001"),
          },
        })
        record({ phase: "phase2_unpaid_order_pricing", name: "calculateProducts", result: "PASS", notes: "calculateProducts fetched.", rawPath: writeJson(rawPath("calculate-products.json"), calculateProducts) })
      } else {
        record({ phase: "phase2_unpaid_order_pricing", name: "calculateProducts", result: "SKIPPED", notes: "stock_sku_item_id mapping is unavailable." })
      }
    } catch (error) {
      record({ phase: "phase2_unpaid_order_pricing", name: "calculateProducts", result: "FAIL", notes: error instanceof Error ? error.message : String(error) })
    }

    const externalOrderId = `citigoo-smoke-${env("RUN_ID", timestamp())}`
    const address = buildDefaultS2bAddress()
    const order = await createOrderClient(client, {
      third_order_id: externalOrderId,
      platform: config.platformId,
      logistics_id: logisticsId,
      store_id: storeId,
      items: [{
        product_id: String(state.supplier_product_id),
        size_id: Number(state.selected_size_id),
        color_id: Number(state.selected_color_id),
        num: 1,
      }],
      address,
      remark: "CitiGoo no-payment dry-run order. Do not pay by default.",
    })
    const orderPath = writeJson(rawPath("create-order.json"), order)
    const supplierOrderId = extractSupplierOrderId(order)
    state.supplier_order_id = supplierOrderId ?? ""
    state.external_order_id = externalOrderId
    record({ phase: "phase2_unpaid_order_pricing", name: "create order", result: supplierOrderId ? "PASS" : "FAIL", notes: supplierOrderId ? `Supplier order ${supplierOrderId}` : "Missing supplier order id.", rawPath: orderPath })
    if (!supplierOrderId) throw new Error("Create order missing supplier_order_id")

    const orderDetail = await getOrderDetailClient(client, supplierOrderId)
    writeJson(rawPath("order-detail.json"), orderDetail)
    state.product_amount = safeString(orderDetail.product_amount)
    state.shipping_amount = safeString(orderDetail.shipping_amount)
    state.discount_amount = safeString(orderDetail.discount_amount)
    state.total_amount = safeString(orderDetail.total_amount)
    state.currency = safeString(orderDetail.currency) || "TODO_CONFIRM_WITH_SUPPLIER"
    state.pay_status = safeString(orderDetail.pay_status)
    state.pay_status_text = safeString(orderDetail.pay_status_text)
    state.status = safeString(orderDetail.status)
    state.status_text = safeString(orderDetail.status_text)
    record({ phase: "phase2_unpaid_order_pricing", name: "order detail", result: "PASS", notes: "Final pricing read from GET /open/v1/order/{id}.", rawPath: rawPath("order-detail.json") })

    const orders = await client.request<unknown>("/open/v1/order", { method: "GET", query: { third_order_id: externalOrderId } })
    record({ phase: "phase2_unpaid_order_pricing", name: "orders by third_order_id", result: "PASS", notes: "Order list fetched.", rawPath: writeJson(rawPath("orders.json"), orders) })
  } catch (error) {
    record({ phase: "phase2_unpaid_order_pricing", name: "phase2", result: "FAIL", notes: error instanceof Error ? error.message : String(error) })
    writeReport()
    process.exitCode = 1
    return
  }

  writeReport()
}

main().catch((error) => {
  record({ phase: "unknown", name: "script", result: "FAIL", notes: error instanceof Error ? error.message : String(error) })
  writeReport()
  process.exitCode = 1
})
