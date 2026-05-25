import type StoreCoreModuleService from "../../modules/store-core/service"
import { S2BDIY_SUPPLIER_ID } from "./index"
import { S2bdiyClient } from "./s2bdiy-client"
import { requireS2bdiyConfig } from "./config"
import { fetchPrintFileBuffer, uploadMaterial } from "./s2bdiy-material"
import { quickCreateProduct, getProductDetail, extractMockupImageUrl } from "./s2bdiy-product"

export type ProvisionS2bProductInput = {
  productId: string
  storeId: string
  title: string
  printFileUrl: string
  basicProductId: string
  sizeId: number
  colorId: number
  viewId: number
  designType?: number
}

export async function provisionS2bProductForMcProduct(
  storeCore: StoreCoreModuleService,
  input: ProvisionS2bProductInput
): Promise<void> {
  const config = requireS2bdiyConfig()
  const client = new S2bdiyClient(config)

  try {
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        supplier_product_status: "not_created",
        supplier_product_error: null,
        s2b_basic_product_id: input.basicProductId,
        s2b_size_id: String(input.sizeId),
        s2b_color_id: String(input.colorId),
        s2b_view_id: String(input.viewId),
        s2b_design_type: input.designType ?? 1,
        supplier_id: S2BDIY_SUPPLIER_ID,
      },
    })

    const { buffer, filename } = await fetchPrintFileBuffer(input.printFileUrl)
    const material = await uploadMaterial(client, {
      buffer,
      filename,
      name: `${input.title}-print`,
    })

    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        s2b_material_id: String(material.id),
        supplier_product_status: "material_uploaded",
      },
    })

    await storeCore.createProductAssets({
      store_id: input.storeId,
      product_id: input.productId,
      supplier_id: S2BDIY_SUPPLIER_ID,
      supplier_material_id: String(material.id),
      supplier_material_name: material.name ?? null,
      supplier_material_url: material.image_url ?? null,
      asset_type: "supplier_material",
      url: material.image_url ?? input.printFileUrl,
      file_format: filename.split(".").pop() ?? "png",
    })

    const created = await quickCreateProduct(client, {
      basic_product_id: Number(input.basicProductId),
      size_id: input.sizeId,
      color_id: input.colorId,
      view_id: input.viewId,
      material_id: material.id,
      name: input.title,
      design_type: input.designType ?? 1,
    })

    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        s2b_designed_product_id: String(created.product_id),
        supplier_product_status: "product_created",
      },
    })

    const detail = await getProductDetail(client, created.product_id)
    const mockupUrl = extractMockupImageUrl(detail)

    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        s2b_mockup_image_url: mockupUrl,
        mockup_image_url: mockupUrl ?? undefined,
        image_url: mockupUrl ?? undefined,
        supplier_product_status: "product_synced",
      },
    })

    if (mockupUrl) {
      await storeCore.createProductAssets({
        store_id: input.storeId,
        product_id: input.productId,
        supplier_id: S2BDIY_SUPPLIER_ID,
        asset_type: "supplier_mockup",
        url: mockupUrl,
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        supplier_product_status: "failed",
        supplier_product_error: message,
      },
    })
    throw error
  }
}

export function resolveS2bIdsFromEnvOrVariant(
  variant: Record<string, unknown> | undefined,
  product: Record<string, unknown>
): {
  basicProductId: string
  sizeId: number
  colorId: number
  viewId: number
} | null {
  const basic =
    (typeof product.s2b_basic_product_id === "string" && product.s2b_basic_product_id) ||
    process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ||
    null
  const sizeId =
    Number(product.s2b_size_id ?? variant?.supplier_size_id ?? process.env.S2BDIY_TEST_SIZE_ID)
  const colorId =
    Number(product.s2b_color_id ?? variant?.supplier_color_id ?? process.env.S2BDIY_TEST_COLOR_ID)
  const viewId = Number(product.s2b_view_id ?? process.env.S2BDIY_TEST_VIEW_ID ?? 1)

  if (!basic || !sizeId || !colorId) {
    return null
  }
  return { basicProductId: basic, sizeId, colorId, viewId }
}
