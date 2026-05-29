import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  getStoreCoreService,
  sendError
} from "../../../../_helpers/store-core"
import { buildShareLinks, buildShareText } from "../../../../../lib/share-links"

/** GET /store/products/:id/share — 获取商品分享链接和文案 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // 1. 解析当前店铺上下文（X-Store-Id 请求头 / 域名 / 默认）
  const { store_id: storeId } = resolveCurrentStore(req)

  // 2. 获取 store-core 模块服务
  const storeCoreService = getStoreCoreService(req)

  // 3. 读取路由参数中的商品 ID
  const productId = (req.params.id ?? req.params.product_id) as string

  // 4. 查询当前店铺下已发布的商品
  //    status: "published" 过滤确保未发布商品返回 404，不会泄露草稿信息
  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
    status: "published"
  })

  const product = products[0]

  // 5. 商品不存在（ID 错误、不属于当前店铺、或未发布）统一返回 404
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  // 6. 确定分享图片 URL（优先级：image_url > mockup_image_url > design_image_url）
  const imageUrl: string | null =
    (product.image_url as string) ||
    (product.mockup_image_url as string) ||
    (product.design_image_url as string) ||
    null

  // 7. 读取 storefront 基础 URL（环境变量 > 默认值）
  const storefrontBaseUrl: string =
    process.env.STOREFRONT_BASE_URL || "http://localhost:3000"

  // 8. 构建完整商品页 URL
  //    mc_product 目前没有 handle 字段，统一使用 product_id 生成 URL
  const productUrl = `${storefrontBaseUrl}/products/${product.id}`

  // 9. 生成分享文案
  const shareText = buildShareText(product.title as string, productUrl)

  // 10. 构建所有渠道的分享链接
  const channels = buildShareLinks({
    productUrl,
    title: product.title as string,
    imageUrl
  })

  // 11. 返回分享数据
  return res.json({
    product_id: product.id,
    store_id: product.store_id,
    title: product.title,
    description: product.description ?? null,
    image_url: imageUrl,
    product_url: productUrl,
    share_text: shareText,
    channels
  })
}
