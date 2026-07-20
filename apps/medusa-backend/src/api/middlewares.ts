import { defineMiddlewares } from "@medusajs/framework/http"
import { stashStoreProductsShipFromQuery } from "../lib/http/store-products-ship-from-query"
import { sellerPublicCorsMiddleware } from "../lib/http/seller-public-cors"
import { sellerAdminGuardMiddleware } from "../lib/platform-admin/seller-admin-guard"
import { enforceActiveStoreMiddleware } from "../lib/store-context/enforce-active-store"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store",
      middlewares: [stashStoreProductsShipFromQuery],
    },
    {
      matcher: "/seller/*",
      middlewares: [sellerPublicCorsMiddleware],
    },
    {
      matcher: "/admin/*",
      middlewares: [sellerAdminGuardMiddleware],
    },
    {
      matcher: "/store/*",
      middlewares: [enforceActiveStoreMiddleware],
    },
    {
      method: ["POST"],
      matcher: "/admin/store-settings/logo",
      bodyParser: { sizeLimit: "4mb" },
    },
    {
      method: ["POST"],
      matcher: "/admin/store-settings/banner",
      bodyParser: { sizeLimit: "6mb" },
    },
    {
      method: ["POST"],
      matcher: "/admin/store-settings/gallery",
      bodyParser: { sizeLimit: "4mb" },
    },
    {
      method: ["POST"],
      matcher: "/store/reviews/upload-image",
      bodyParser: { sizeLimit: "6mb" },
    },
  ],
})
