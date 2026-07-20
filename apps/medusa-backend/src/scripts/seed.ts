import type { ExecArgs } from "./medusa-exec-args"
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

type SupplierSeed = {
  id: string
  code: string
  name: string
  country: string
  status: "active" | "inactive" | "archived"
  ship_from_country?: string | null
  ship_to_regions?: string[] | null
  raw_json: Record<string, unknown>
}

type SupplierProductSeed = {
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

type SupplierProductVariantSeed = {
  id: string
  supplier_product_id: string
  supplier_variant_id: string
  color: string
  size: string
  sku: string
  cost: number
  stock_status: "in_stock" | "out_of_stock" | "unknown"
  raw_json: Record<string, unknown>
}

type SupplierPrintSpecSeed = {
  id: string
  supplier_product_id: string
  supplier_variant_id: string | null
  print_position: string
  print_file_width: number
  print_file_height: number
  dpi: number
  accepted_formats: string[]
  background_required: boolean
  safe_margin: number
  bleed: number
  color_mode: string
  status: "active" | "inactive" | "archived"
}

type PlatformDesignTemplateSeed = {
  id: string
  platform_product_id: string
  name: string
  canvas_width: number
  canvas_height: number
  design_area_x: number
  design_area_y: number
  design_area_width: number
  design_area_height: number
  preview_background_url: string
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
    supplier_product_id: "sp_tshirt",
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

const suppliers: SupplierSeed[] = [
  {
    id: "sup_citigoo_mock",
    code: "citigoo_mock",
    name: "CitiGoo Mock Supplier",
    country: "US",
    status: "active",
    ship_from_country: "US",
    ship_to_regions: ["us"],
    raw_json: {
      phase: "2A",
      note: "Mock supplier for default_store AI product generation"
    }
  },
  {
    id: "sup_s2bdiy",
    code: "s2bdiy",
    name: "S2BDIY",
    country: "CN",
    status: "active",
    ship_from_country: "US",
    ship_to_regions: ["us"],
    raw_json: {
      phase: "2B",
      note: "S2BDIY print-on-demand supplier for production fulfillment"
    }
  }
]

const supplierProducts: SupplierProductSeed[] = [
  {
    id: "sp_tshirt",
    supplier_id: "sup_citigoo_mock",
    supplier_product_id: "mock_tshirt_001",
    platform_product_id: "pp_tshirt",
    name: "Mock Cotton T-shirt",
    category: "apparel",
    base_cost: 8.5,
    currency: "usd",
    status: "active",
    raw_json: {
      printable: true,
      supported_positions: ["front"]
    }
  },
  {
    id: "sp_hoodie",
    supplier_id: "sup_citigoo_mock",
    supplier_product_id: "mock_hoodie_001",
    platform_product_id: "pp_hoodie",
    name: "Mock Pullover Hoodie",
    category: "apparel",
    base_cost: 18,
    currency: "usd",
    status: "active",
    raw_json: {
      printable: true,
      supported_positions: ["front"]
    }
  },
  {
    id: "sp_mug",
    supplier_id: "sup_citigoo_mock",
    supplier_product_id: "mock_mug_001",
    platform_product_id: "pp_mug",
    name: "Mock Ceramic Mug",
    category: "home",
    base_cost: 4.25,
    currency: "usd",
    status: "active",
    raw_json: {
      printable: true,
      supported_positions: ["wrap"]
    }
  }
]

const supplierProductVariants: SupplierProductVariantSeed[] = [
  ...["black", "white"].flatMap((color) =>
    ["S", "M", "L", "XL"].map((size) => ({
      id: `spv_tshirt_${color}_${size.toLowerCase()}`,
      supplier_product_id: "sp_tshirt",
      supplier_variant_id: `mock_tshirt_${color}_${size.toLowerCase()}`,
      color,
      size,
      sku: `MOCK-TSHIRT-${color.toUpperCase()}-${size}`,
      cost: 8.5,
      stock_status: "in_stock" as const,
      raw_json: {
        phase: "2A",
        print_position: "front"
      }
    }))
  ),
  ...["black", "navy"].flatMap((color) =>
    ["S", "M", "L", "XL"].map((size) => ({
      id: `spv_hoodie_${color}_${size.toLowerCase()}`,
      supplier_product_id: "sp_hoodie",
      supplier_variant_id: `mock_hoodie_${color}_${size.toLowerCase()}`,
      color,
      size,
      sku: `MOCK-HOODIE-${color.toUpperCase()}-${size}`,
      cost: 18,
      stock_status: "in_stock" as const,
      raw_json: {
        phase: "2A",
        print_position: "front"
      }
    }))
  ),
  ...["11oz", "15oz"].map((size) => ({
    id: `spv_mug_white_${size}`,
    supplier_product_id: "sp_mug",
    supplier_variant_id: `mock_mug_white_${size}`,
    color: "white",
    size,
    sku: `MOCK-MUG-WHITE-${size.toUpperCase()}`,
    cost: 4.25,
    stock_status: "in_stock" as const,
    raw_json: {
      phase: "2A",
      print_position: "wrap"
    }
  }))
]

const supplierPrintSpecs: SupplierPrintSpecSeed[] = [
  {
    id: "sps_tshirt_front_png",
    supplier_product_id: "sp_tshirt",
    supplier_variant_id: null,
    print_position: "front",
    print_file_width: 4500,
    print_file_height: 5400,
    dpi: 300,
    accepted_formats: ["png"],
    background_required: false,
    safe_margin: 120,
    bleed: 0,
    color_mode: "RGB",
    status: "active"
  },
  {
    id: "sps_hoodie_front_png",
    supplier_product_id: "sp_hoodie",
    supplier_variant_id: null,
    print_position: "front",
    print_file_width: 4500,
    print_file_height: 4500,
    dpi: 300,
    accepted_formats: ["png"],
    background_required: false,
    safe_margin: 120,
    bleed: 0,
    color_mode: "RGB",
    status: "active"
  },
  {
    id: "sps_mug_wrap_png",
    supplier_product_id: "sp_mug",
    supplier_variant_id: null,
    print_position: "wrap",
    print_file_width: 2550,
    print_file_height: 1050,
    dpi: 300,
    accepted_formats: ["png"],
    background_required: false,
    safe_margin: 60,
    bleed: 0,
    color_mode: "RGB",
    status: "active"
  }
]

const platformDesignTemplates: PlatformDesignTemplateSeed[] = [
  {
    id: "pdt_tshirt_front",
    platform_product_id: "pp_tshirt",
    name: "T-shirt Front Print",
    canvas_width: 4500,
    canvas_height: 5400,
    design_area_x: 450,
    design_area_y: 420,
    design_area_width: 3600,
    design_area_height: 4200,
    preview_background_url: "http://localhost:8001/mockup-templates/tshirt-front.png",
    status: "active"
  },
  {
    id: "pdt_hoodie_front",
    platform_product_id: "pp_hoodie",
    name: "Hoodie Front Print",
    canvas_width: 4500,
    canvas_height: 4500,
    design_area_x: 450,
    design_area_y: 420,
    design_area_width: 3600,
    design_area_height: 3300,
    preview_background_url: "https://cdn.example.com/mockups/hoodie-front.png",
    status: "active"
  },
  {
    id: "pdt_mug_wrap",
    platform_product_id: "pp_mug",
    name: "Mug Wrap Print",
    canvas_width: 2550,
    canvas_height: 1050,
    design_area_x: 120,
    design_area_y: 120,
    design_area_width: 2310,
    design_area_height: 810,
    preview_background_url: "https://cdn.example.com/mockups/mug-wrap.png",
    status: "active"
  }
]

const toSupplierCreatePayload = (supplier: SupplierSeed) => ({
  ...supplier,
  ship_to_regions: supplier.ship_to_regions
    ? (supplier.ship_to_regions as unknown as Record<string, unknown>)
    : null,
})

const createMissing = async <T extends { id: string }>(
  existingIds: Set<string>,
  items: T[],
  create: (items: T[]) => Promise<unknown>
) => {
  const missing = items.filter((item) => !existingIds.has(item.id))

  if (missing.length) {
    await create(missing)
  }
}

export default async function seedStoreCore({ container }: ExecArgs) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const existingStores = await storeCoreService.listStores({
    id: [DEFAULT_STORE_ID, "test_store"]
  })

  const existingIds = new Set<string>(existingStores.map((store) => String(store.id)))

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
  const existingPlatformProductIds = new Set<string>(
    existingPlatformProducts.map((product) => String(product.id))
  )
  await createMissing(existingPlatformProductIds, platformProducts, (items) =>
    storeCoreService.createPlatformProducts(items)
  )

  const existingSuppliers = await storeCoreService.listSuppliers({
    id: suppliers.map((supplier) => supplier.id)
  })
  await createMissing(
    new Set<string>(existingSuppliers.map((supplier) => String(supplier.id))),
    suppliers,
    (items) => storeCoreService.createSuppliers(items.map(toSupplierCreatePayload))
  )

  const existingSupplierProducts = await storeCoreService.listSupplierProducts({
    id: supplierProducts.map((product) => product.id)
  })
  await createMissing(
    new Set<string>(existingSupplierProducts.map((product) => String(product.id))),
    supplierProducts,
    (items) => storeCoreService.createSupplierProducts(items)
  )

  const existingSupplierProductVariants =
    await storeCoreService.listSupplierProductVariants({
      id: supplierProductVariants.map((variant) => variant.id)
    })
  await createMissing(
    new Set<string>(existingSupplierProductVariants.map((variant) => String(variant.id))),
    supplierProductVariants,
    (items) => storeCoreService.createSupplierProductVariants(items)
  )

  const existingSupplierPrintSpecs = await storeCoreService.listSupplierPrintSpecs({
    id: supplierPrintSpecs.map((spec) => spec.id)
  })
  await createMissing(
    new Set<string>(existingSupplierPrintSpecs.map((spec) => String(spec.id))),
    supplierPrintSpecs,
    (items) => storeCoreService.createSupplierPrintSpecs(items)
  )

  const existingPlatformDesignTemplates =
    await storeCoreService.listPlatformDesignTemplates({
      id: platformDesignTemplates.map((template) => template.id)
    })
  await createMissing(
    new Set<string>(existingPlatformDesignTemplates.map((template) => String(template.id))),
    platformDesignTemplates,
    (items) => storeCoreService.createPlatformDesignTemplates(items)
  )
}
