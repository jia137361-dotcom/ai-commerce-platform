import { ExecArgs } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../modules/store-core"
import StoreCoreModuleService from "../modules/store-core/service"
import { DEFAULT_STORE_ID } from "../lib/store-context"

type PlatformProductSeed = {
  id: string
  title: string
  category: string
  description: string
  base_cost: number
  supplier: string
  supplier_product_id: string
  available_colors: string[]
  available_sizes: string[]
  print_area: Record<string, string>
  status: "active" | "inactive" | "archived"
}

const platformProducts: PlatformProductSeed[] = [
  {
    id: "pp_tshirt",
    title: "T-shirt",
    category: "apparel",
    description: "Classic printable short-sleeve t-shirt.",
    base_cost: 8.5,
    supplier: "platform",
    supplier_product_id: "supplier_tshirt",
    available_colors: ["white", "black", "navy", "heather_gray"],
    available_sizes: ["S", "M", "L", "XL", "2XL"],
    print_area: { front: "12x16in", back: "12x16in" },
    status: "active"
  },
  {
    id: "pp_hoodie",
    title: "Hoodie",
    category: "apparel",
    description: "Pullover hoodie with front print support.",
    base_cost: 18,
    supplier: "platform",
    supplier_product_id: "supplier_hoodie",
    available_colors: ["black", "navy", "gray"],
    available_sizes: ["S", "M", "L", "XL", "2XL"],
    print_area: { front: "12x12in", back: "12x14in" },
    status: "active"
  },
  {
    id: "pp_mug",
    title: "Mug",
    category: "home",
    description: "Ceramic mug with wraparound print area.",
    base_cost: 4.25,
    supplier: "platform",
    supplier_product_id: "supplier_mug",
    available_colors: ["white"],
    available_sizes: ["11oz", "15oz"],
    print_area: { wrap: "8.5x3.5in" },
    status: "active"
  },
  {
    id: "pp_phone_case",
    title: "Phone Case",
    category: "accessories",
    description: "Printable phone case base product.",
    base_cost: 6.75,
    supplier: "platform",
    supplier_product_id: "supplier_phone_case",
    available_colors: ["clear", "black"],
    available_sizes: ["iPhone", "Samsung"],
    print_area: { back: "full-bleed" },
    status: "active"
  },
  {
    id: "pp_poster",
    title: "Poster",
    category: "wall-art",
    description: "Matte poster print.",
    base_cost: 3.5,
    supplier: "platform",
    supplier_product_id: "supplier_poster",
    available_colors: ["white"],
    available_sizes: ["12x18", "18x24", "24x36"],
    print_area: { front: "full-bleed" },
    status: "active"
  },
  {
    id: "pp_canvas",
    title: "Canvas",
    category: "wall-art",
    description: "Stretched canvas wall art.",
    base_cost: 12,
    supplier: "platform",
    supplier_product_id: "supplier_canvas",
    available_colors: ["white"],
    available_sizes: ["12x12", "16x20", "24x36"],
    print_area: { front: "full-bleed" },
    status: "active"
  }
]

export default async function seedStoreCore({ container }: ExecArgs) {
  const storeCoreService = container.resolve<StoreCoreModuleService>(STORE_CORE_MODULE)

  const existingStores = await storeCoreService.listStores({
    id: [DEFAULT_STORE_ID, "test_store"]
  })

  const existingIds = new Set(existingStores.map((store) => store.id))

  if (!existingIds.has(DEFAULT_STORE_ID)) {
    await storeCoreService.createStores({
      id: DEFAULT_STORE_ID,
      name: "Default Store",
      slug: "default-store",
      status: "active"
    })
  }

  if (!existingIds.has("test_store")) {
    await storeCoreService.createStores({
      id: "test_store",
      name: "Test Store",
      slug: "test-store",
      status: "active"
    })
  }

  const existingPlatformProducts = await storeCoreService.listPlatformProducts({
    id: platformProducts.map((product) => product.id)
  })
  const existingPlatformProductIds = new Set(
    existingPlatformProducts.map((product) => product.id)
  )
  const missingPlatformProducts = platformProducts.filter(
    (product) => !existingPlatformProductIds.has(product.id)
  )

  if (missingPlatformProducts.length) {
    await storeCoreService.createPlatformProducts([...missingPlatformProducts])
  }
}
