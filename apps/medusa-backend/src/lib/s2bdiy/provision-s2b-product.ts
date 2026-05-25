import type StoreCoreModuleService from "../../modules/store-core/service"
import { S2BDIY_SUPPLIER_ID } from "./index"
import { S2bdiyClient } from "./s2bdiy-client"
import { requireS2bdiyConfig } from "./config"
import { fetchPrintFileBuffer, uploadMaterial } from "./s2bdiy-material"
import { quickCreateProduct, getProductDetail, extractMockupImageUrl } from "./s2bdiy-product"
import {
  mergeMcProductSupplierMetadata,
  readMcProductSupplierField,
} from "./mc-product-supplier-fields"

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

  const [productRow] = await storeCore.listProducts({ id: input.productId })
  const product = (productRow ?? {}) as Record<string, unknown>

  try {
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        supplier_id: S2BDIY_SUPPLIER_ID,
        metadata: mergeMcProductSupplierMetadata(product, {
          basic_product_id: input.basicProductId,
          supplier_size_id: String(input.sizeId),
          supplier_color_id: String(input.colorId),
          view_id: String(input.viewId),
          design_type: input.designType ?? 1,
        }),
      },
    })

    const { buffer, filename } = await fetchPrintFileBuffer(input.printFileUrl)
    const material = await uploadMaterial(client, {
      buffer,
      filename,
      name: `${input.title}-print`,
    })

    const [afterMaterial] = await storeCore.listProducts({ id: input.productId })
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        metadata: mergeMcProductSupplierMetadata((afterMaterial ?? {}) as Record<string, unknown>, {
          supplier_material_id: String(material.id),
        }),
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

    const [afterCreate] = await storeCore.listProducts({ id: input.productId })
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        metadata: mergeMcProductSupplierMetadata((afterCreate ?? {}) as Record<string, unknown>, {
          supplier_product_id: String(created.product_id),
        }),
      },
    })

    const detail = await getProductDetail(client, created.product_id)
    const mockupUrl = extractMockupImageUrl(detail)

    const [afterDetail] = await storeCore.listProducts({ id: input.productId })
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        mockup_image_url: mockupUrl,
        image_url: mockupUrl ?? undefined,
        metadata: mergeMcProductSupplierMetadata((afterDetail ?? {}) as Record<string, unknown>, {
          mockup_image_url: mockupUrl,
        }),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const [failedRow] = await storeCore.listProducts({ id: input.productId })
    await storeCore.updateProducts({
      selector: { id: input.productId },
      data: {
        metadata: mergeMcProductSupplierMetadata((failedRow ?? product) as Record<string, unknown>, {
          supplier_provision_error: message,
        }),
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
    (typeof readMcProductSupplierField(product, "basic_product_id") === "string" &&
      (readMcProductSupplierField(product, "basic_product_id") as string)) ||
    process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ||
    null
  const sizeId = Number(
    readMcProductSupplierField(product, "supplier_size_id") ??
      variant?.supplier_size_id ??
      process.env.S2BDIY_TEST_SIZE_ID
  )
  const colorId = Number(
    readMcProductSupplierField(product, "supplier_color_id") ??
      variant?.supplier_color_id ??
      process.env.S2BDIY_TEST_COLOR_ID
  )
  const viewId = Number(
    readMcProductSupplierField(product, "view_id") ?? process.env.S2BDIY_TEST_VIEW_ID ?? 1
  )

  if (!basic || !sizeId || !colorId) {
    return null
  }
  return { basicProductId: basic, sizeId, colorId, viewId }
}
