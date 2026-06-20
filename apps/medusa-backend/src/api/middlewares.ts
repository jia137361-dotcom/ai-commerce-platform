import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/store-settings/logo",
      bodyParser: { sizeLimit: "4mb" },
    },
  ],
})
