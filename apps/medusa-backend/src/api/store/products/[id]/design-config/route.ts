import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { getStoreCoreService, sendError, getMcProductById } from "../../../../_helpers/store-core"
import { getS2bdiyAccessToken } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { getS2bdiyConfig, isS2bdiyMockMode, requireS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id as string
  const { store_id: storeId } = resolveCurrentStore(req)

  const storeCoreService = getStoreCoreService(req)
  const product = await getMcProductById(storeCoreService, productId, storeId)

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const basicProductId = product.basic_product_id as string | null
  if (!basicProductId) {
    return sendError(res, 400, "DESIGNER_NOT_SUPPORTED", "This product does not support online design")
  }

  const mockMode = isS2bdiyMockMode()

  if (mockMode) {
    const config = requireS2bdiyConfig()
    return res.json({
      sdk_base_url: "https://opensdktest.s2bdiy.com",
      token: "mock_token_for_development",
      basic_product_id: basicProductId,
      view_id: product.view_id ?? null,
      design_type: product.design_type ?? 1,
    })
  }

  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  try {
    const token = await getS2bdiyAccessToken(s2bConfig)

    const isTest = s2bConfig.apiBaseUrl.includes("test") || s2bConfig.apiBaseUrl.includes("sandbox")
    const sdkBaseUrl = isTest
      ? "https://opensdktest.s2bdiy.com"
      : "https://opensdk.s2bdiy.com"

    return res.json({
      sdk_base_url: sdkBaseUrl,
      token,
      basic_product_id: basicProductId,
      view_id: product.view_id ?? null,
      design_type: product.design_type ?? 1,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[design-config] failed to get S2BDIY token:", message)
    return sendError(res, 502, "SUPPLIER_AUTH_FAILED", "Unable to connect to design service")
  }
}
