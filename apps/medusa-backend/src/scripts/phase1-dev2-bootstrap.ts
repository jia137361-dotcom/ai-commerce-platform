import type { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ensureVariantHasPriceSet } from "../lib/ensure-variant-price-set"
import { resolveDefaultRegionId } from "../lib/resolve-default-region"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { DEFAULT_STORE_ID } from "../lib/store-context"

const TEST_STORE_ID = "test_store"
const VARIANT_PRICE_AMOUNT = 1999
const VARIANT_PRICE_CURRENCY = "usd"

export default async function phase1Dev2Bootstrap({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT) as {
    listProducts: (f?: object) => Promise<Array<{ id: string; variants?: Array<{ id: string }> }>>
  }
  const storeCore = container.resolve<StoreCoreModuleService>(STORE_CORE_MODULE)
  const regionId = await resolveDefaultRegionId(container, VARIANT_PRICE_CURRENCY)

  async function ensureNativeProduct(
    handle: string,
    title: string,
    storeId: string
  ): Promise<{ productId: string; variantId: string }> {
    const existing = await productModule.listProducts({ handle: [handle] } as object)
    if (existing[0]?.variants?.[0]?.id) {
      const productId = existing[0].id
      const variantId = existing[0].variants[0].id
      await ensureVariantHasPriceSet(container, {
        variantId,
        amount: VARIANT_PRICE_AMOUNT,
        currencyCode: VARIANT_PRICE_CURRENCY,
      })
      return { productId, variantId }
    }

    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title,
            handle,
            status: "published",
            metadata: { store_id: storeId },
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                metadata: { store_id: storeId },
                options: { Default: "Default" },
                prices: [
                  {
                    amount: VARIANT_PRICE_AMOUNT,
                    currency_code: VARIANT_PRICE_CURRENCY,
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    const product = result[0]
    const variantId = product?.variants?.[0]?.id
    if (!product?.id || !variantId) {
      throw new Error(`Failed to create variant for ${handle}`)
    }

    await ensureVariantHasPriceSet(container, {
      variantId,
      amount: VARIANT_PRICE_AMOUNT,
      currencyCode: VARIANT_PRICE_CURRENCY,
    })

    return { productId: product.id, variantId }
  }

  async function retireLegacyMcProducts() {
    const legacyIds = ["prod_mc_phase1_def", "prod_mc_phase1_tst"]
    const legacy = await storeCore.listProducts({ id: legacyIds })
    for (const row of legacy) {
      await storeCore.updateProducts({
        selector: { id: row.id },
        data: { status: "archived" },
      })
    }
  }

  await retireLegacyMcProducts()

  const defaultNative = await ensureNativeProduct(
    "phase1-default-bridge",
    "Phase1 Default Bridge Product",
    DEFAULT_STORE_ID
  )
  const testNative = await ensureNativeProduct(
    "phase1-test-bridge",
    "Phase1 Test Bridge Product",
    TEST_STORE_ID
  )

  async function ensureMcProduct(
    id: string,
    storeId: string,
    title: string,
    medusaProductId: string,
    medusaVariantId: string
  ) {
    const existing = await storeCore.listProducts({ id: [id] })
    if (existing.length) {
      await storeCore.updateProducts({
        selector: { id },
        data: {
          status: "published",
          medusa_product_id: medusaProductId,
          medusa_variant_id: medusaVariantId,
        },
      })
      return id
    }

    await storeCore.createProducts([
      {
        id,
        store_id: storeId,
        title,
        description: "Phase1 self-test bridge product",
        status: "published",
        source: "manual",
        price: 19.99,
        cost: 8.5,
        medusa_product_id: medusaProductId,
        medusa_variant_id: medusaVariantId,
        tags: ["phase1", "self-test"],
        variants: null,
        metadata: { phase1_self_test: true },
      },
    ])
    return id
  }

  const defaultMcId = await ensureMcProduct(
    "prod_phase1_default",
    DEFAULT_STORE_ID,
    "Phase1 Default Store Product",
    defaultNative.productId,
    defaultNative.variantId
  )
  const testMcId = await ensureMcProduct(
    "prod_phase1_test",
    TEST_STORE_ID,
    "Phase1 Test Store Product",
    testNative.productId,
    testNative.variantId
  )

  console.log(
    JSON.stringify(
      {
        region_id: regionId,
        default_store: {
          mc_product_id: defaultMcId,
          medusa_product_id: defaultNative.productId,
          medusa_variant_id: defaultNative.variantId,
        },
        test_store: {
          mc_product_id: testMcId,
          medusa_product_id: testNative.productId,
          medusa_variant_id: testNative.variantId,
        },
      },
      null,
      2
    )
  )
}
