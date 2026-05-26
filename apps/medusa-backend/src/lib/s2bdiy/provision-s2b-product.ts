import type StoreCoreModuleService from "../../modules/store-core/service"
import { requireS2bdiyConfig } from "../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import { fetchPrintFileBuffer, uploadMaterialClient } from "../../modules/suppliers/s2bdiy/s2bdiy-material"
import {
  extractMockupImageUrl,
  getProductDetail,
  quickCreateProduct,
} from "../../modules/suppliers/s2bdiy/s2bdiy-product"

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

  const S2BDIY_SUPPLIER_ID = "sup_s2bdiy"

  try {
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        supplier_id: S2BDIY_SUPPLIER_ID,
        basic_product_id: input.basicProductId,
        supplier_size_id: String(input.sizeId),
        supplier_color_id: String(input.colorId),
        view_id: String(input.viewId),
        design_type: input.designType ?? 1,
      },
    })

    const { buffer, filename } = await fetchPrintFileBuffer(input.printFileUrl)
    const material = await uploadMaterialClient(client, {
      buffer,
      filename,
      name: `${input.title}-print`,
    })

    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        supplier_material_id: String(material.id),
      },
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
        // NOTE: This column starts as catalog row id (e.g. sp_tshirt) at draft-time.
        // After provisioning, we overwrite it with S2BDIY quickCreate product_id for fulfillment.
        supplier_product_id: String(created.product_id),
      },
    })

    const detail = await getProductDetail(client, created.product_id)
    const mockupUrl = extractMockupImageUrl(detail)

    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        mockup_image_url: mockupUrl,
        image_url: mockupUrl ?? undefined,
      },
    })
  } catch (error: unknown) {
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
    (typeof product.basic_product_id === "string" && product.basic_product_id) ||
    process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ||
    null
  const sizeId = Number(
    (product.supplier_size_id as unknown) ?? variant?.supplier_size_id ?? process.env.S2BDIY_TEST_SIZE_ID
  )
  const colorId = Number(
    (product.supplier_color_id as unknown) ?? variant?.supplier_color_id ?? process.env.S2BDIY_TEST_COLOR_ID
  )
  const viewId = Number((product.view_id as unknown) ?? process.env.S2BDIY_TEST_VIEW_ID ?? 1)

  if (!basic || !sizeId || !colorId) {
    return null
  }
  return { basicProductId: basic, sizeId, colorId, viewId }
}
