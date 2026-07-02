import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
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
