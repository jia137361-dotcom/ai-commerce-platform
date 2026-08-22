import { defineMiddlewares } from "@medusajs/framework/http"
import { adminCorsMiddleware } from "../lib/http/admin-cors"
import { stashStoreProductsShipFromQuery } from "../lib/http/store-products-ship-from-query"
import { sellerPublicCorsMiddleware } from "../lib/http/seller-public-cors"
import { enforceBuyerEmailAllowlistMiddleware } from "../lib/http/buyer-email-allowlist"
import { sellerAdminGuardMiddleware } from "../lib/platform-admin/seller-admin-guard"
import { enforceActiveStoreMiddleware } from "../lib/store-context/enforce-active-store"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store",
      middlewares: [stashStoreProductsShipFromQuery],
    },
    {
      method: ["POST"],
      matcher: "/auth/customer/emailpass",
      middlewares: [enforceBuyerEmailAllowlistMiddleware],
    },
    {
      method: ["POST"],
      matcher: "/auth/customer/emailpass/register",
      middlewares: [enforceBuyerEmailAllowlistMiddleware],
    },
    {
      matcher: "/seller/*",
      middlewares: [sellerPublicCorsMiddleware],
    },
    {
      matcher: "/admin/*",
      middlewares: [adminCorsMiddleware, sellerAdminGuardMiddleware],
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
      matcher: "/admin/store-products/*/images",
      bodyParser: { sizeLimit: "6mb" },
    },
    {
      method: ["POST"],
      matcher: "/store/reviews/upload-image",
      bodyParser: { sizeLimit: "6mb" },
    },
    {
      method: ["POST"],
      matcher: "/store/design-sessions/material-upload",
      bodyParser: { sizeLimit: "10mb" },
    },
  ],
})
