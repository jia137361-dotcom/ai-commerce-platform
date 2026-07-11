import type { ExecArgs } from "@medusajs/framework/types"
import { getS2bdiyConfig } from "../modules/suppliers/s2bdiy/config"
import { syncBasicProduct } from "../modules/suppliers/services/supplier-sync-service"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

const SUPPLIER_ID = "sup_s2bdiy"
const BASIC_PRODUCT_ID = Number(
  process.env.S2BDIY_TEST_BASIC_PRODUCT_ID || process.env.S2BDIY_BASIC_PRODUCT_ID || "1672"
)
const PRODUCT_ROW_ID = `sp_s2b_${BASIC_PRODUCT_ID}`

/** Eolink quickCreate example for basic_product_id 1672 (white tee). */
const LOCAL_WHITE_TEE_FIXTURE = {
  supplier_product_id: `s2b_basic_${BASIC_PRODUCT_ID}`,
  platform_product_id: "pp_tshirt",
  basic_product_id: String(BASIC_PRODUCT_ID),
  basic_product_code: "LOCAL1672",
  basic_product_name: "White T-shirt (local fixture)",
  basic_product_en_name: "White T-shirt",
  name: "S2BDIY White T-shirt",
  category: "apparel",
  base_cost: 8.5,
  currency: "usd",
  status: "active" as const,
  raw_json: {
    source: "local_fixture",
    note: "Seeded for AI Studio when S2BDIY sync is unavailable",
  },
  variants: [
    { id: `spv_s2b_${BASIC_PRODUCT_ID}_white_s`, supplier_variant_id: "1672_white_s", color: "white", color_name: "White", size: "S", size_name: "S", supplier_color_id: "6", supplier_size_id: "19", sku: "S2B-1672-WHITE-S", cost: 8.5 },
    { id: `spv_s2b_${BASIC_PRODUCT_ID}_white_m`, supplier_variant_id: "1672_white_m", color: "white", color_name: "White", size: "M", size_name: "M", supplier_color_id: "6", supplier_size_id: "20", sku: "S2B-1672-WHITE-M", cost: 8.5 },
    { id: `spv_s2b_${BASIC_PRODUCT_ID}_white_l`, supplier_variant_id: "1672_white_l", color: "white", color_name: "White", size: "L", size_name: "L", supplier_color_id: "6", supplier_size_id: "21", sku: "S2B-1672-WHITE-L", cost: 8.5 },
  ],
  print_spec: {
    id: `sps_s2b_${BASIC_PRODUCT_ID}_front`,
    view_id: "1",
    view_name: "A面",
    print_position: "front",
    print_file_width: 4500,
    print_file_height: 5400,
    design_area_width: 3600,
    design_area_height: 4200,
  },
}

async function ensureLocalFixture(storeCore: StoreCoreModuleService) {
  const existing = await storeCore.listSupplierProducts({ id: PRODUCT_ROW_ID })
  const productData = {
    supplier_id: SUPPLIER_ID,
    supplier_product_id: LOCAL_WHITE_TEE_FIXTURE.supplier_product_id,
    platform_product_id: LOCAL_WHITE_TEE_FIXTURE.platform_product_id,
    basic_product_id: LOCAL_WHITE_TEE_FIXTURE.basic_product_id,
    basic_product_code: LOCAL_WHITE_TEE_FIXTURE.basic_product_code,
    basic_product_name: LOCAL_WHITE_TEE_FIXTURE.basic_product_name,
    basic_product_en_name: LOCAL_WHITE_TEE_FIXTURE.basic_product_en_name,
    name: LOCAL_WHITE_TEE_FIXTURE.name,
    category: LOCAL_WHITE_TEE_FIXTURE.category,
    base_cost: LOCAL_WHITE_TEE_FIXTURE.base_cost,
    currency: LOCAL_WHITE_TEE_FIXTURE.currency,
    status: LOCAL_WHITE_TEE_FIXTURE.status,
    raw_json: LOCAL_WHITE_TEE_FIXTURE.raw_json,
  }

  if (existing.length) {
    await (storeCore as any).updateSupplierProducts({
      selector: { id: PRODUCT_ROW_ID },
      data: productData,
    })
  } else {
    await storeCore.createSupplierProducts({ id: PRODUCT_ROW_ID, ...productData })
  }

  const existingVariants = await storeCore.listSupplierProductVariants({ supplier_product_id: PRODUCT_ROW_ID })
  for (const variant of LOCAL_WHITE_TEE_FIXTURE.variants) {
    const match = existingVariants.find((row) => row.id === variant.id)
    const variantData = {
      supplier_product_id: PRODUCT_ROW_ID,
      basic_product_id: LOCAL_WHITE_TEE_FIXTURE.basic_product_id,
      supplier_variant_id: variant.supplier_variant_id,
      supplier_color_id: variant.supplier_color_id,
      supplier_size_id: variant.supplier_size_id,
      color: variant.color,
      size: variant.size,
      color_name: variant.color_name,
      size_name: variant.size_name,
      sku: variant.sku,
      cost: variant.cost,
      stock_status: "in_stock" as const,
      raw_json: { source: "local_fixture" },
    }
    if (match) {
      await (storeCore as any).updateSupplierProductVariants({
        selector: { id: variant.id },
        data: variantData,
      })
    } else {
      await storeCore.createSupplierProductVariants({ id: variant.id, ...variantData })
    }
  }

  const spec = LOCAL_WHITE_TEE_FIXTURE.print_spec
  const existingSpecs = await storeCore.listSupplierPrintSpecs({ supplier_product_id: PRODUCT_ROW_ID })
  const specData = {
    supplier_product_id: PRODUCT_ROW_ID,
    basic_product_id: LOCAL_WHITE_TEE_FIXTURE.basic_product_id,
    view_id: spec.view_id,
    view_name: spec.view_name,
    print_position: spec.print_position,
    print_file_width: spec.print_file_width,
    print_file_height: spec.print_file_height,
    design_area_width: spec.design_area_width,
    design_area_height: spec.design_area_height,
    design_area_unit: "px" as const,
    design_type: 1,
    dpi: 300,
    accepted_formats: ["png", "jpg", "jpeg"],
    status: "active" as const,
  }
  if (existingSpecs.length) {
    await (storeCore as any).updateSupplierPrintSpecs({
      selector: { id: existingSpecs[0].id },
      data: specData,
    })
  } else {
    await storeCore.createSupplierPrintSpecs({ id: spec.id, ...specData })
  }

  console.log(`AI_STUDIO_LOCAL_FIXTURE_OK=basic_product_id:${BASIC_PRODUCT_ID}`)
}

export default async function aiStudioSupplierBootstrap({ container }: ExecArgs) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  if (getS2bdiyConfig()) {
    try {
      const synced = await syncBasicProduct(BASIC_PRODUCT_ID, SUPPLIER_ID, { storeCoreService: storeCore })
      console.log(`AI_STUDIO_S2BDIY_SYNC_OK=${JSON.stringify(synced)}`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`AI_STUDIO_S2BDIY_SYNC_FAILED=${message}`)
      console.warn("AI_STUDIO_FALLBACK=local_fixture")
    }
  } else {
    console.warn("AI_STUDIO_S2BDIY_SYNC_SKIPPED=invalid_or_placeholder_credentials")
    console.warn("AI_STUDIO_FALLBACK=local_fixture")
  }

  await ensureLocalFixture(storeCore)
}
