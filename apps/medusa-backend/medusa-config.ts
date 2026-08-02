import { defineConfig, loadEnv } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const stripePaymentProviders =
  process.env.STRIPE_API_KEY && process.env.STRIPE_API_KEY.length > 0
    ? [
        {
          resolve: "@medusajs/payment-stripe",
          id: "stripe",
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            capture: true,
            automaticPaymentMethods: true,
          },
        },
      ]
    : []

const paypalPaymentProviders =
  process.env.PAYPAL_CLIENT_ID &&
  process.env.PAYPAL_CLIENT_SECRET &&
  process.env.PAYPAL_ENVIRONMENT === "sandbox"
    ? [
        {
          resolve: "./src/modules/paypal",
          id: "paypal",
          options: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            environment: "sandbox",
            webhookId: process.env.PAYPAL_WEBHOOK_ID,
            brandName: process.env.PAYPAL_BRAND_NAME || "CiiVerse",
            returnUrl:
              process.env.PAYPAL_RETURN_URL ||
              `${process.env.STOREFRONT_URL || "http://127.0.0.1:5174"}/checkout?paypal_return=1`,
            cancelUrl:
              process.env.PAYPAL_CANCEL_URL ||
              `${process.env.STOREFRONT_URL || "http://127.0.0.1:5174"}/checkout?paypal_cancel=1`,
          },
        },
      ]
    : []

const disableAdmin = process.env.MEDUSA_ADMIN_DISABLE === "true"
const databaseSslDisabled = process.env.DATABASE_SSL === "false"

export default defineConfig({
  ...(disableAdmin ? { admin: { disable: true } } : {}),
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(databaseSslDisabled
      ? { databaseDriverOptions: { connection: { ssl: false } } }
      : {}),
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors:
        process.env.STORE_CORS ||
        "http://127.0.0.1:5174,http://localhost:5174,http://localhost:8000,http://localhost:3000",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5176,http://localhost:5176,http://localhost:7000,http://localhost:7001",
      authCors:
        process.env.AUTH_CORS ||
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5176,http://localhost:5176,http://localhost:7000,http://localhost:7001",
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
      resolve: "./src/modules/store-coupons"
    },
    {
      resolve: "./src/modules/checkout-payment-attempts"
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/locking-postgres",
            id: "postgres",
            is_default: true,
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [...stripePaymentProviders, ...paypalPaymentProviders],
      },
    },
  ]
})
