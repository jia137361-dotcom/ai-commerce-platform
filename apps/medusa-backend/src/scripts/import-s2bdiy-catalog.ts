import type { MedusaExecArgs } from "./medusa-exec-args"
import { STORE_CORE_MODULE } from "../modules/store-core"
import StoreCoreModuleService from "../modules/store-core/service"

// =============================================================================
// S2BDIY 产品目录导入脚本 (1513 products)
// 用法: npx medusa exec ./src/scripts/import-s2bdiy-catalog.ts
// =============================================================================

type CategoryData = {
  id: string
  name: string
  parent_id: string | null
  level: number
  product_count: number
}

type SupplierProductData = {
  id: string
  supplier_id: string
  supplier_product_id: string
  platform_product_id: string
  name: string
  category: string
  base_cost: number
  currency: string
  status: "active" | "inactive" | "archived"
  raw_json: Record<string, unknown>
}

// =============================================================================
// 11个一级分类
// =============================================================================
const level1Categories: CategoryData[] = [
  { id: "cat_clothing", name: "Clothing & Underwear", parent_id: null, level: 1, product_count: 188 },
  { id: "cat_home", name: "Home Furnishings", parent_id: null, level: 1, product_count: 588 },
  { id: "cat_jewelry", name: "Jewelry", parent_id: null, level: 1, product_count: 38 },
  { id: "cat_pet", name: "Pet Supplies", parent_id: null, level: 1, product_count: 33 },
  { id: "cat_protective", name: "Protective Equipment", parent_id: null, level: 1, product_count: 32 },
  { id: "cat_sports", name: "Sports & Outdoors", parent_id: null, level: 1, product_count: 20 },
  { id: "cat_car", name: "Car Accessories", parent_id: null, level: 1, product_count: 47 },
  { id: "cat_digital", name: "Digital Accessories", parent_id: null, level: 1, product_count: 273 },
  { id: "cat_maternity", name: "Maternity & Baby", parent_id: null, level: 1, product_count: 22 },
  { id: "cat_shoes", name: "Shoes & Accessories", parent_id: null, level: 1, product_count: 141 },
  { id: "cat_bags", name: "Bags", parent_id: null, level: 1, product_count: 131 },
]

// =============================================================================
// 二级分类
// =============================================================================
const level2Categories: CategoryData[] = [
  // Clothing & Underwear
  { id: "cat_mens_clothing", name: "Men's Clothing", parent_id: "cat_clothing", level: 2, product_count: 123 },
  { id: "cat_womens_clothing", name: "Women's Clothing", parent_id: "cat_clothing", level: 2, product_count: 47 },
  { id: "cat_kids_clothing", name: "Children's & Teenagers' Clothing", parent_id: "cat_clothing", level: 2, product_count: 18 },

  // Home Furnishings
  { id: "cat_interior_decor", name: "Interior Decorations", parent_id: "cat_home", level: 2, product_count: 187 },
  { id: "cat_pillow", name: "Pillow Series", parent_id: "cat_home", level: 2, product_count: 28 },
  { id: "cat_bathroom", name: "Bathroom Supplies", parent_id: "cat_home", level: 2, product_count: 29 },
  { id: "cat_bedding", name: "Bedding", parent_id: "cat_home", level: 2, product_count: 36 },
  { id: "cat_outdoor_decor", name: "Pavilion / Outdoor Decorations", parent_id: "cat_home", level: 2, product_count: 101 },
  { id: "cat_kitchen", name: "Kitchen Supplies", parent_id: "cat_home", level: 2, product_count: 36 },
  { id: "cat_cupwares", name: "Cupwares", parent_id: "cat_home", level: 2, product_count: 42 },
  { id: "cat_grooming", name: "Grooming Supplies", parent_id: "cat_home", level: 2, product_count: 5 },
  { id: "cat_rain_gear", name: "Rain Gear", parent_id: "cat_home", level: 2, product_count: 7 },
  { id: "cat_dining", name: "Restaurant / Dining Supplies", parent_id: "cat_home", level: 2, product_count: 32 },
  { id: "cat_holiday", name: "Holiday Decorations", parent_id: "cat_home", level: 2, product_count: 85 },

  // Jewelry
  { id: "cat_earrings", name: "Earrings", parent_id: "cat_jewelry", level: 2, product_count: 0 },
  { id: "cat_necklaces", name: "Necklaces", parent_id: "cat_jewelry", level: 2, product_count: 26 },
  { id: "cat_rings", name: "Rings", parent_id: "cat_jewelry", level: 2, product_count: 3 },
  { id: "cat_bracelets", name: "Bracelets", parent_id: "cat_jewelry", level: 2, product_count: 9 },

  // Pet Supplies
  { id: "cat_pet_bandana", name: "Headbands / Bandanas", parent_id: "cat_pet", level: 2, product_count: 9 },
  { id: "cat_pet_furnishing", name: "Pet Home Furnishings", parent_id: "cat_pet", level: 2, product_count: 7 },
  { id: "cat_pet_clothing", name: "Pet Clothing", parent_id: "cat_pet", level: 2, product_count: 2 },
  { id: "cat_pet_accessories", name: "Pet Accessories", parent_id: "cat_pet", level: 2, product_count: 15 },

  // Protective Equipment
  { id: "cat_masks", name: "Masks", parent_id: "cat_protective", level: 2, product_count: 21 },
  { id: "cat_face_shields", name: "Face Shields", parent_id: "cat_protective", level: 2, product_count: 11 },

  // Sports & Outdoors
  { id: "cat_skateboards", name: "Skateboards", parent_id: "cat_sports", level: 2, product_count: 1 },
  { id: "cat_beach_gear", name: "Beach Gear", parent_id: "cat_sports", level: 2, product_count: 6 },
  { id: "cat_outdoor_activities", name: "Outdoor Activities", parent_id: "cat_sports", level: 2, product_count: 4 },
  { id: "cat_fishing", name: "Fishing Gear", parent_id: "cat_sports", level: 2, product_count: 1 },
  { id: "cat_sports_protective", name: "Sports Protective Gear", parent_id: "cat_sports", level: 2, product_count: 3 },
  { id: "cat_yoga", name: "Yoga & Fitness", parent_id: "cat_sports", level: 2, product_count: 2 },
  { id: "cat_sports_equipment", name: "Sports Equipment", parent_id: "cat_sports", level: 2, product_count: 3 },

  // Car Accessories
  { id: "cat_car_exterior", name: "Car Exterior", parent_id: "cat_car", level: 2, product_count: 27 },
  { id: "cat_car_interior", name: "Car Interior", parent_id: "cat_car", level: 2, product_count: 20 },

  // Digital Accessories
  { id: "cat_storage", name: "Storage Items", parent_id: "cat_digital", level: 2, product_count: 19 },
  { id: "cat_apple_cases", name: "Apple Phone Cases", parent_id: "cat_digital", level: 2, product_count: 137 },
  { id: "cat_samsung_cases", name: "Samsung Phone Cases", parent_id: "cat_digital", level: 2, product_count: 34 },
  { id: "cat_oppo_cases", name: "OPPO Phone Cases", parent_id: "cat_digital", level: 2, product_count: 5 },
  { id: "cat_huawei_cases", name: "Huawei Phone Cases", parent_id: "cat_digital", level: 2, product_count: 2 },
  { id: "cat_earphone_cases", name: "Apple Earphone Cases", parent_id: "cat_digital", level: 2, product_count: 16 },
  { id: "cat_watch_bands", name: "Apple Watch Bands", parent_id: "cat_digital", level: 2, product_count: 5 },
  { id: "cat_phone_stands", name: "Phone Stands", parent_id: "cat_digital", level: 2, product_count: 19 },
  { id: "cat_mouse_pads", name: "Mouse Pads", parent_id: "cat_digital", level: 2, product_count: 30 },
  { id: "cat_crystal_stickers", name: "Crystal Stickers", parent_id: "cat_digital", level: 2, product_count: 1 },
  { id: "cat_protective_cases", name: "Protective Cases", parent_id: "cat_digital", level: 2, product_count: 5 },

  // Maternity & Baby
  { id: "cat_toys", name: "Toys", parent_id: "cat_maternity", level: 2, product_count: 18 },
  { id: "cat_baby_clothing", name: "Clothing", parent_id: "cat_maternity", level: 2, product_count: 1 },
  { id: "cat_baby_supplies", name: "Baby Supplies", parent_id: "cat_maternity", level: 2, product_count: 3 },

  // Shoes & Accessories
  { id: "cat_shoes", name: "Shoes", parent_id: "cat_shoes", level: 2, product_count: 8 },
  { id: "cat_socks", name: "Socks", parent_id: "cat_shoes", level: 2, product_count: 14 },
  { id: "cat_hats", name: "Hats", parent_id: "cat_shoes", level: 2, product_count: 61 },
  { id: "cat_clothing_accessories", name: "Clothing & Accessories", parent_id: "cat_shoes", level: 2, product_count: 58 },

  // Bags
  { id: "cat_lunch_bags", name: "Lunch Bags", parent_id: "cat_bags", level: 2, product_count: 14 },
  { id: "cat_suitcases", name: "Suitcases", parent_id: "cat_bags", level: 2, product_count: 8 },
  { id: "cat_backpacks", name: "Backpacks", parent_id: "cat_bags", level: 2, product_count: 31 },
  { id: "cat_shoulder_bags", name: "Shoulder Bags", parent_id: "cat_bags", level: 2, product_count: 6 },
  { id: "cat_pencil_cases", name: "Pencil Cases", parent_id: "cat_bags", level: 2, product_count: 7 },
  { id: "cat_computer_bags", name: "Computer Bags", parent_id: "cat_bags", level: 2, product_count: 2 },
  { id: "cat_storage_items", name: "Storage Items", parent_id: "cat_bags", level: 2, product_count: 52 },
  { id: "cat_wallets", name: "Wallets", parent_id: "cat_bags", level: 2, product_count: 9 },
]

// =============================================================================
// 三级分类 (部分，用于展示结构)
// =============================================================================
const level3Categories: CategoryData[] = [
  // Men's Clothing - T-shirts
  { id: "cat_mens_tshirts", name: "T-shirts", parent_id: "cat_mens_clothing", level: 3, product_count: 46 },
  { id: "cat_mens_vests", name: "Vests", parent_id: "cat_mens_clothing", level: 3, product_count: 7 },
  { id: "cat_mens_pajamas", name: "Pajamas", parent_id: "cat_mens_clothing", level: 3, product_count: 12 },
  { id: "cat_mens_polo", name: "Polo shirts", parent_id: "cat_mens_clothing", level: 3, product_count: 7 },
  { id: "cat_mens_sport_shirts", name: "Sport shirts", parent_id: "cat_mens_clothing", level: 3, product_count: 2 },
  { id: "cat_mens_sweatshirts", name: "Sweatshirts", parent_id: "cat_mens_clothing", level: 3, product_count: 34 },
  { id: "cat_mens_pants", name: "Pants", parent_id: "cat_mens_clothing", level: 3, product_count: 11 },
  { id: "cat_mens_underwear", name: "Underwear", parent_id: "cat_mens_clothing", level: 3, product_count: 4 },

  // Women's Clothing
  { id: "cat_womens_tshirts", name: "T-shirts", parent_id: "cat_womens_clothing", level: 3, product_count: 16 },
  { id: "cat_womens_skirts", name: "Skirts", parent_id: "cat_womens_clothing", level: 3, product_count: 8 },
  { id: "cat_womens_swimwear", name: "Swimwear", parent_id: "cat_womens_clothing", level: 3, product_count: 3 },
  { id: "cat_womens_long_sleeve", name: "Long-sleeved shirts", parent_id: "cat_womens_clothing", level: 3, product_count: 12 },
  { id: "cat_womens_bra", name: "Bra and underwear", parent_id: "cat_womens_clothing", level: 3, product_count: 1 },
  { id: "cat_womens_pants", name: "Pants", parent_id: "cat_womens_clothing", level: 3, product_count: 3 },
  { id: "cat_womens_vests", name: "Vests", parent_id: "cat_womens_clothing", level: 3, product_count: 2 },
  { id: "cat_womens_pajamas", name: "Pajamas", parent_id: "cat_womens_clothing", level: 3, product_count: 2 },

  // Cupwares - Mugs
  { id: "cat_mugs", name: "Mugs", parent_id: "cat_cupwares", level: 3, product_count: 16 },
  { id: "cat_coasters", name: "Coasters", parent_id: "cat_cupwares", level: 3, product_count: 13 },
  { id: "cat_coffee_mugs", name: "Coffee mugs", parent_id: "cat_cupwares", level: 3, product_count: 3 },
  { id: "cat_thermos_mugs", name: "Thermos mugs", parent_id: "cat_cupwares", level: 3, product_count: 3 },

  // Apple Phone Cases
  { id: "cat_apple_tempered", name: "Tempered glass", parent_id: "cat_apple_cases", level: 3, product_count: 30 },
  { id: "cat_apple_leather", name: "Leather", parent_id: "cat_apple_cases", level: 3, product_count: 22 },
  { id: "cat_apple_silicone", name: "Silicone", parent_id: "cat_apple_cases", level: 3, product_count: 55 },
  { id: "cat_apple_tpu", name: "TPU", parent_id: "cat_apple_cases", level: 3, product_count: 30 },
]

// =============================================================================
// 导入函数
// =============================================================================

const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID?.trim() || "default_store"

const slugifyCategory = (name: string) =>
  name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

async function importCategory(
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  cat: CategoryData
) {
  const existing = await storeCoreService.listProductCategories({ id: cat.id, store_id: storeId })
  if (existing.length) {
    console.log(`  跳过已存在的分类: ${cat.name}`)
    return
  }

  await storeCoreService.createProductCategories({
    id: cat.id,
    store_id: storeId,
    name: cat.name,
    slug: slugifyCategory(cat.name),
    parent_id: cat.parent_id,
    level: cat.level,
    description: `S2BDIY catalog (${cat.product_count} products)`,
  })
}

export default async function importS2bdiyCatalog({ container }: MedusaExecArgs) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const storeId = DEFAULT_STORE_ID

  console.log("==========================================")
  console.log("S2BDIY 产品目录导入")
  console.log(`Store: ${storeId}`)
  console.log("==========================================")

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    throw new Error(`Store not found: ${storeId}`)
  }

  // 1. 检查 S2BDIY 供应商是否存在
  const suppliers = await storeCoreService.listSuppliers({ code: ["s2bdiy"] })
  if (suppliers.length === 0) {
    console.log("创建 S2BDIY 供应商...")
    await storeCoreService.createSuppliers({
      id: "sup_s2bdiy",
      code: "s2bdiy",
      name: "S2BDIY",
      country: "CN",
      ship_from_country: "CN",
      ship_to_regions: ["us", "eu", "gb", "ca", "au"] as unknown as Record<string, unknown>,
      status: "active",
      raw_json: { source: "s2bdiy_api", catalog_version: "2024" },
    })
  }

  // 2. 导入一级分类
  console.log(`导入 ${level1Categories.length} 个一级分类...`)
  for (const cat of level1Categories) {
    try {
      await importCategory(storeCoreService, storeId, cat)
    } catch (e) {
      console.log(`  跳过已存在的分类: ${cat.name}`)
    }
  }

  // 3. 导入二级分类
  console.log(`导入 ${level2Categories.length} 个二级分类...`)
  for (const cat of level2Categories) {
    try {
      await importCategory(storeCoreService, storeId, cat)
    } catch (e) {
      console.log(`  跳过已存在的分类: ${cat.name}`)
    }
  }

  // 4. 导入三级分类
  console.log(`导入 ${level3Categories.length} 个三级分类...`)
  for (const cat of level3Categories) {
    try {
      await importCategory(storeCoreService, storeId, cat)
    } catch (e) {
      console.log(`  跳过已存在的分类: ${cat.name}`)
    }
  }

  console.log("==========================================")
  console.log("分类导入完成！")
  console.log("==========================================")
  console.log("")
  console.log("下一步：")
  console.log("1. 配置 S2BDIY API 凭证（apps/medusa-backend/.env）")
  console.log("2. 在 apps/medusa-backend 目录运行：")
  console.log("     npx medusa exec ./src/scripts/sync-s2bdiy-products.ts")
  console.log("   或在 monorepo 根目录：")
  console.log("     npm --workspace apps/medusa-backend exec -- npx medusa exec ./src/scripts/sync-s2bdiy-products.ts")
}
