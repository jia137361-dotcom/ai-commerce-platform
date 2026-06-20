import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const stripePaymentProviders =
  process.env.STRIPE_API_KEY && process.env.STRIPE_API_KEY.length > 0
    ? [
        {
          resolve: "@medusajs/medusa/payment-stripe",
          id: "stripe",
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          },
        },
      ]
    : []

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors:
        process.env.STORE_CORS ||
        "http://127.0.0.1:5174,http://localhost:5174,http://localhost:8000,http://localhost:3000",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://127.0.0.1:5173,http://localhost:5173,http://localhost:7000,http://localhost:7001",
      authCors:
        process.env.AUTH_CORS ||
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174,http://localhost:7000,http://localhost:7001",
      jwtSecret: process.env.JWT_SECRET || "development-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET || "development-cookie-secret"
    }
  },
  modules: [
    {
      resolve: "./src/modules/store-core"
    },
    {
      resolve: "./src/modules/webhook-events"
    },
    {
      resolve: "./src/modules/fulfillment-orders"
    },
    {
      resolve: "./src/modules/shipments"
    },
    {
      resolve: "./src/modules/buyer-refund-requests"
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: stripePaymentProviders,
      },
    },
  ]
})
