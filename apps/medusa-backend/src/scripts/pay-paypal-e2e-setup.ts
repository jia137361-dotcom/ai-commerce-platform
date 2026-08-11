import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolveNativeBridgeForPublish } from "../lib/native-product-bridge"
import { ensureNativeBridgeCartable } from "../lib/ensure-native-bridge-cartable"
import { ensureNativeProductShippingProfile } from "../lib/product-shipping"

const STORE_ID = "mkt01_paypal_runtime_20260801_store"
const PRODUCT_ID = "mkt01_paypal_runtime_20260801_product"
const SELLER_EMAIL = "mkt01_paypal_seller_runtime_20260801@example.com"
const storeId = process.env.PAY_PAYPAL_TEST_STORE_ID?.trim() || STORE_ID
const productId = process.env.PAY_PAYPAL_TEST_PRODUCT_ID?.trim() || PRODUCT_ID
const sellerEmail = process.env.PAY_PAYPAL_TEST_SELLER_EMAIL?.trim().toLowerCase() || SELLER_EMAIL
const allowRuntimeAccountCreate = process.env.PAY_PAYPAL_CREATE_RUNTIME_ACCOUNTS === "true"

type AuthResponse = {
  success: boolean
  error?: string
  authIdentity?: { id?: string; app_metadata?: Record<string, unknown> | null }
}

const assertSafeRuntimeSetup = () => {
  if (process.env.PAY_PAYPAL_E2E_SETUP !== "true") {
    throw new Error("Set PAY_PAYPAL_E2E_SETUP=true to create the isolated PayPal fixture")
  }
  if (process.env.NODE_ENV !== "development") {
    throw new Error("PayPal E2E fixture setup only runs with NODE_ENV=development")
  }
  if (process.env.PAYPAL_ENVIRONMENT !== "sandbox") {
    throw new Error("PayPal E2E fixture setup only runs with PAYPAL_ENVIRONMENT=sandbox")
  }
  const dbUrl = process.env.DATABASE_URL ?? ""
  if (/prod|production/i.test(dbUrl) || !/localhost|127\.0\.0\.1|5433|ai_commerce/i.test(dbUrl)) {
    throw new Error("Refusing PayPal E2E fixture setup because DATABASE_URL does not look local/development")
  }
}

async function createRuntimeSellerIfMissing(container: ExecArgs["container"]) {
  const password = process.env.PAY_PAYPAL_TEST_PASSWORD
  if (!allowRuntimeAccountCreate) {
    throw new Error(`Create seller ${sellerEmail} with medusa user before running setup`)
  }
  if (!password || password.length < 8) {
    throw new Error("PAY_PAYPAL_TEST_PASSWORD is required to create the isolated PayPal runtime seller")
  }

  const userModule = container.resolve(Modules.USER) as {
    createUsers: (data: Record<string, unknown>) => Promise<{ id: string; email?: string | null }>
  }
  const authModule = container.resolve(Modules.AUTH) as {
    register: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
    updateAuthIdentities: (data: Record<string, unknown>) => Promise<unknown>
    authenticate: (provider: string, data: Record<string, unknown>) => Promise<AuthResponse>
  }

  const user = await userModule.createUsers({
    email: sellerEmail,
    first_name: "PayPal",
    last_name: "Runtime Seller",
    metadata: {
      test_only: true,
      fixture: "paypal-payment-closure",
      created_by: "pay-paypal:e2e:setup",
    },
  })
  const registered = await authModule.register("emailpass", {
    body: { email: sellerEmail, password },
  })
  if (!registered.success || !registered.authIdentity?.id) {
    throw new Error(registered.error ?? "Unable to create isolated PayPal runtime seller auth identity")
  }
  await authModule.updateAuthIdentities({
    id: registered.authIdentity.id,
    app_metadata: { user_id: user.id },
  })
  const verified = await authModule.authenticate("emailpass", {
    body: { email: sellerEmail, password },
  })
  if (!verified.success) {
    throw new Error("Unable to verify isolated PayPal runtime seller credentials")
  }
  console.log("PAY_PAYPAL_RUNTIME_SELLER_CREATED=true")
  console.log("PAY_PAYPAL_TEST_PASSWORD_PRESENT=true")
  return user
}

export default async function setupPayPalE2e({ container }: ExecArgs) {
  assertSafeRuntimeSetup()

  const users = container.resolve(Modules.USER) as {
    listUsers: (filters: object) => Promise<Array<{ id: string; email?: string }>>
  }
  let seller = (await users.listUsers({ email: sellerEmail }))[0]
  if (!seller?.id) {
    seller = await createRuntimeSellerIfMissing(container)
  }

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const existingStore = (await storeCore.listStores({ id: storeId }))[0]
  if (!existingStore) {
    await storeCore.createStores({
      id: storeId,
      owner_user_id: seller.id,
      name: `PayPal Runtime Test Store ${storeId}`,
      slug: storeId.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase(),
      description: "Isolated PayPal sandbox marketplace fixture.",
      status: "active",
    })
    await storeCore.createStoreMembers({ store_id: storeId, user_id: seller.id, role: "owner" })
  }

  const settings = (await storeCore.listStoreSettings({ store_id: storeId }))[0]
  const settingsData = {
    store_id: storeId,
    brand_name: `PayPal Runtime Test Store ${storeId}`,
    logo_url: "https://placehold.co/256x256/png?text=PAYPAL",
    support_email: sellerEmail,
    seo_title: "PayPal Runtime Test Store",
    seo_description: "Isolated test store for PayPal sandbox checkout.",
    metadata: {
      test_only: true,
      fixture: "paypal-payment-closure",
      description: "Isolated test store for PayPal sandbox checkout.",
      announcement: "PayPal sandbox checkout fixture",
      banner_url: "https://placehold.co/1600x600/png?text=PayPal+Sandbox+Test+Store",
      gallery_urls: ["https://placehold.co/800x600/png?text=PayPal+Sandbox+Gallery"],
    },
  }
  if (settings?.id) {
    await storeCore.updateStoreSettings({ selector: { id: settings.id, store_id: storeId }, data: settingsData })
  } else {
    await storeCore.createStoreSettings(settingsData)
  }

  let product = (await storeCore.listProducts({ id: productId, store_id: storeId }))[0]
  if (!product) {
    product = await storeCore.createProducts({
      id: productId,
      store_id: storeId,
      title: `PayPal Runtime Test Product ${productId}`,
      description: "One isolated shippable product for PayPal sandbox checkout.",
      status: "draft",
      source: "manual",
      supplier_id: "sup_citigoo_mock",
      platform_product_id: "pp_tshirt",
      supplier_product_id: "sp_tshirt",
      supplier_variant_id: "spv_tshirt_black_m",
      image_url: "https://placehold.co/900x900/png?text=PayPal+Sandbox+Product",
      mockup_image_url: "https://placehold.co/900x900/png?text=PayPal+Sandbox+Mockup",
      price: 39,
      cost: 8.5,
      tags: ["mkt01", "paypal-test"],
      metadata: {
        requires_shipping: true,
        pay_paypal_e2e_fixture: true,
        test_only: true,
        fixture: "paypal-payment-closure",
      },
    })
  }

  const bridge = await resolveNativeBridgeForPublish(container, product as unknown as Record<string, unknown>, storeId)
  await ensureNativeBridgeCartable(container, bridge)
  await ensureNativeProductShippingProfile(container, bridge.medusaProductId)
  const updated = await storeCore.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: { status: "published", medusa_product_id: bridge.medusaProductId, medusa_variant_id: bridge.medusaVariantId },
  })
  const published = Array.isArray(updated) ? updated[0] : updated

  console.log(`PAY_PAYPAL_TEST_SELLER=${sellerEmail}`)
  console.log(`PAY_PAYPAL_TEST_STORE=${storeId}`)
  console.log(`PAY_PAYPAL_TEST_PRODUCT=${productId}`)
  console.log(`PAY_PAYPAL_TEST_NATIVE_PRODUCT=${bridge.medusaProductId}`)
  console.log(`PAY_PAYPAL_TEST_NATIVE_VARIANT=${bridge.medusaVariantId}`)
  console.log(`PAY_PAYPAL_TEST_STATUS=${published?.status ?? "unknown"}`)
}
