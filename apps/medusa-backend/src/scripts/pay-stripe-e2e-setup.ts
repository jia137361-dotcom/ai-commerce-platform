import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolveNativeBridgeForPublish } from "../lib/native-product-bridge"
import { ensureNativeBridgeCartable } from "../lib/ensure-native-bridge-cartable"
import { ensureNativeProductShippingProfile } from "../lib/product-shipping"

const STORE_ID = "mkt01_stripe_test_store_20260621_01"
const PRODUCT_ID = "mkt01_stripe_test_product_20260621_01"
const SELLER_EMAIL = "mkt01_stripe_seller_20260621_01@example.com"

export default async function setupPayStripeE2e({ container }: ExecArgs) {
  if (process.env.PAY_STRIPE_E2E_SETUP !== "true") {
    throw new Error("Set PAY_STRIPE_E2E_SETUP=true to create the one isolated PAY-STRIPE-01 fixture")
  }

  const users = container.resolve(Modules.USER) as {
    listUsers: (filters: object) => Promise<Array<{ id: string; email?: string }>>
  }
  const seller = (await users.listUsers({ email: SELLER_EMAIL }))[0]
  if (!seller?.id) throw new Error(`Create seller ${SELLER_EMAIL} with medusa user before running setup`)

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const existingStore = (await storeCore.listStores({ id: STORE_ID }))[0]
  if (!existingStore) {
    await storeCore.createStores({
      id: STORE_ID,
      owner_user_id: seller.id,
      name: "MKT01 Stripe Test Store 20260621 01",
      slug: "mkt01-stripe-test-store-20260621-01",
      description: "Isolated Stripe test-mode marketplace fixture.",
      status: "active",
    })
    await storeCore.createStoreMembers({ store_id: STORE_ID, user_id: seller.id, role: "owner" })
  }

  const settings = (await storeCore.listStoreSettings({ store_id: STORE_ID }))[0]
  const settingsData = {
    store_id: STORE_ID,
    brand_name: "MKT01 Stripe Test Store 20260621 01",
    logo_url: "https://placehold.co/256x256/png?text=MKT01",
    support_email: SELLER_EMAIL,
    seo_title: "MKT01 Stripe Test Store",
    seo_description: "Isolated test store for official Medusa Stripe checkout.",
    metadata: {
      description: "Isolated test store for official Medusa Stripe checkout.",
      announcement: "Stripe test-mode checkout fixture",
      banner_url: "https://placehold.co/1600x600/png?text=MKT01+Stripe+Test+Store",
      gallery_urls: ["https://placehold.co/800x600/png?text=MKT01+Stripe+Gallery"],
    },
  }
  if (settings?.id) {
    await storeCore.updateStoreSettings({ selector: { id: settings.id, store_id: STORE_ID }, data: settingsData })
  } else {
    await storeCore.createStoreSettings(settingsData)
  }

  let product = (await storeCore.listProducts({ id: PRODUCT_ID, store_id: STORE_ID }))[0]
  if (!product) {
    product = await storeCore.createProducts({
      id: PRODUCT_ID,
      store_id: STORE_ID,
      title: "MKT01 Stripe Test Product 20260621 01",
      description: "One isolated shippable product for Stripe test-mode checkout.",
      status: "draft",
      source: "manual",
      supplier_id: "sup_citigoo_mock",
      platform_product_id: "pp_tshirt",
      supplier_product_id: "sp_tshirt",
      supplier_variant_id: "spv_tshirt_black_m",
      image_url: "https://placehold.co/900x900/png?text=MKT01+Stripe+Test+Product",
      mockup_image_url: "https://placehold.co/900x900/png?text=MKT01+Stripe+Mockup",
      price: 39,
      cost: 8.5,
      tags: ["mkt01", "stripe-test"],
      metadata: { requires_shipping: true, pay_stripe_e2e_fixture: true },
    })
  }

  const bridge = await resolveNativeBridgeForPublish(container, product as unknown as Record<string, unknown>, STORE_ID)
  await ensureNativeBridgeCartable(container, bridge)
  await ensureNativeProductShippingProfile(container, bridge.medusaProductId)
  const updated = await storeCore.updateProducts({
    selector: { id: PRODUCT_ID, store_id: STORE_ID },
    data: { status: "published", medusa_product_id: bridge.medusaProductId, medusa_variant_id: bridge.medusaVariantId },
  })
  const published = Array.isArray(updated) ? updated[0] : updated

  console.log(`PAY_STRIPE_TEST_SELLER=${SELLER_EMAIL}`)
  console.log(`PAY_STRIPE_TEST_STORE=${STORE_ID}`)
  console.log(`PAY_STRIPE_TEST_PRODUCT=${PRODUCT_ID}`)
  console.log(`PAY_STRIPE_TEST_NATIVE_PRODUCT=${bridge.medusaProductId}`)
  console.log(`PAY_STRIPE_TEST_NATIVE_VARIANT=${bridge.medusaVariantId}`)
  console.log(`PAY_STRIPE_TEST_STATUS=${published?.status ?? "unknown"}`)
}
