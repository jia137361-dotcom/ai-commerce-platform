import { mockProducts, type CartLineItem, type SelectedOption, type StoreCart, type StoreProduct } from "./mock-data"

type ApiSelectedOption = {
  name?: string | null
  title?: string | null
  option?: { title?: string | null } | null
  value?: string | number | null
}

type MedusaProduct = {
  id?: string
  product_id?: string
  title?: string
  handle?: string
  description?: string | null
  category?: string | null
  category_name?: string | null
  thumbnail?: string | null
  image_url?: string | null
  mockup_image_url?: string | null
  design_image_url?: string | null
  print_file_url?: string | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
  supplier_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  is_cart_addable?: boolean
  average_rating?: number | null
  review_count?: number
  images?: Array<{ url?: string | null }>
  price?: number | string | null
  variants?: Array<{ prices?: Array<{ amount?: number; currency_code?: string }> }>
  tags?: string[] | null
  metadata?: Record<string, unknown> | null
}

type ProductsResponse = {
  products?: MedusaProduct[]
  count?: number
}

type ProductResponse = {
  product?: MedusaProduct
}

type ApiCartLineItem = {
  id?: string
  title?: string
  thumbnail?: string | null
  quantity?: number
  unit_price?: number
  total?: number
  variant_id?: string
  variant_title?: string | null
  color_name?: string | null
  size_name?: string | null
  color?: string | null
  size?: string | null
  supplier_color_id?: string | number | null
  supplier_size_id?: string | number | null
  selected_options?: ApiSelectedOption[] | null
  options?: ApiSelectedOption[] | null
  variant?: {
    title?: string | null
    options?: ApiSelectedOption[] | null
  } | null
  product_id?: string
  metadata?: Record<string, unknown> | null
}

type ApiCart = {
  id?: string
  cart_id?: string
  store_id?: string
  email?: string
  currency_code?: string
  items?: ApiCartLineItem[]
  subtotal?: number
  total?: number
}

type CartMutationResponse = ApiCart & {
  cart?: ApiCart
}

export type ProductLoadResult = {
  products: StoreProduct[]
  source: "backend" | "mock"
  error?: string
}

export type SingleProductLoadResult = {
  product: StoreProduct
  source: "backend" | "mock"
  error?: string
}

const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

const isPlaceholderValue = (value: string) =>
  !value ||
  value.includes("replace_me") ||
  value.includes("<") ||
  value.includes(">")

export const storefrontConfig = {
  backendUrl: readEnv("VITE_MEDUSA_BASE_URL", readEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "http://127.0.0.1:9000")),
  publishableKey: import.meta.env.VITE_PUBLISHABLE_API_KEY || readEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"),
  storeId: readEnv("VITE_DEFAULT_STORE_ID", readEnv("NEXT_PUBLIC_STORE_ID", "default_store")),
}

export const cartStorageKey = `citigoo:${storefrontConfig.storeId || "default_store"}:cart_id`

const money = (value: number | string | null | undefined) => {
  if (typeof value === "string" && value.trim().startsWith("$")) return value
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return "$48.00"
  const amount = numeric > 999 ? numeric / 100 : numeric
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export const formatMoney = (value: number | undefined, currency = "USD") => {
  const amount = Number.isFinite(value) ? (value as number) : 0
  const normalized = amount > 999 ? amount / 100 : amount
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(normalized)
}

const readNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value > 999 ? value / 100 : value
  const numeric = Number(value)
  return Number.isFinite(numeric) ? (numeric > 999 ? numeric / 100 : numeric) : undefined
}

const firstVariantPrice = (product: MedusaProduct) =>
  product.variants?.flatMap((variant) => variant.prices ?? [])[0]?.amount

const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

const readId = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

const readSelectedOptions = (value: unknown): SelectedOption[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((option) => {
    if (!option || typeof option !== "object") return []
    const record = option as ApiSelectedOption
    const value = readId(record.value)
    if (!value) return []
    return [{
      name: readString(record.name) ?? readString(record.title) ?? readString(record.option?.title) ?? "Option",
      value,
    }]
  })
}

const findOptionValue = (options: SelectedOption[], name: string) =>
  options.find((option) => option.name.toLowerCase() === name)?.value

const apiHeaders = (json = false) => {
  const headers: Record<string, string> = {
    "x-publishable-api-key": storefrontConfig.publishableKey,
    "X-Store-Id": storefrontConfig.storeId || "default_store",
  }
  if (json) headers["Content-Type"] = "application/json"
  return headers
}

const maskedKey = (key: string) => {
  if (!key) return "missing"
  if (isPlaceholderValue(key)) return "placeholder"
  return `${key.slice(0, 3)}...${key.slice(-4)}`
}

const describeApiError = (error: unknown, path: string) => {
  const base = storefrontConfig.backendUrl
  if (error instanceof Error) {
    console.error("[storefront-api]", {
      path,
      backendUrl: base,
      storeId: storefrontConfig.storeId || "default_store",
      publishableKey: maskedKey(storefrontConfig.publishableKey),
      message: error.message,
    })
    return error.message
  }
  console.error("[storefront-api]", {
    path,
    backendUrl: base,
    storeId: storefrontConfig.storeId || "default_store",
    publishableKey: maskedKey(storefrontConfig.publishableKey),
    message: String(error),
  })
  return String(error)
}

const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const backendUrl = storefrontConfig.backendUrl.replace(/\/+$/, "")
  if (isPlaceholderValue(storefrontConfig.publishableKey)) {
    throw new Error("Publishable API key is missing or still a placeholder. Set VITE_PUBLISHABLE_API_KEY in apps/storefront/.env.local and restart Vite.")
  }

  const url = backendUrl ? `${backendUrl}${path}` : path
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...apiHeaders(Boolean(init.body)),
        ...(init.headers ?? {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === "Failed to fetch" || error instanceof TypeError) {
      throw new Error(`Backend unreachable or CORS/network error while requesting ${url}. Confirm Medusa is running and the backend allows the storefront origin.`)
    }
    throw new Error(`Network error while requesting ${url}: ${message}`)
  }

  if (!response.ok) {
    const text = await response.text()
    const detail = text ? `: ${text.slice(0, 240)}` : ""
    throw new Error(`Store API returned HTTP ${response.status} for ${path}${detail}`)
  }

  return response.json() as Promise<T>
}

const toStoreProduct = (product: MedusaProduct, index: number): StoreProduct => {
  const fallback = mockProducts[index % mockProducts.length]
  const metadata = product.metadata ?? {}
  const category =
    product.category_name ??
    product.category ??
    readString(metadata.category) ??
    fallback.category
  const rawPrice = product.price ?? firstVariantPrice(product)
  const imageUrl =
    product.image_url ??
    product.mockup_image_url ??
    product.thumbnail ??
    product.images?.find((image) => image.url)?.url ??
    fallback.imageUrl

  return {
    id: product.product_id ?? product.id ?? product.handle ?? `backend-product-${index}`,
    title: product.title ?? "Untitled Product",
    category,
    price: money(rawPrice),
    numericPrice: readNumber(rawPrice),
    imageUrl,
    mockupImageUrl: product.mockup_image_url ?? undefined,
    designImageUrl: product.design_image_url ?? undefined,
    printFileUrl: product.print_file_url ?? undefined,
    badge: readString(metadata.badge) ?? (index === 0 ? "Featured" : undefined),
    description: product.description ?? undefined,
    medusaProductId: product.medusa_product_id ?? undefined,
    medusaVariantId: product.medusa_variant_id ?? undefined,
    supplierId: product.supplier_id ?? undefined,
    supplierProductId: product.supplier_product_id ?? undefined,
    supplierVariantId: product.supplier_variant_id ?? undefined,
    isCartAddable: Boolean(product.is_cart_addable && product.medusa_variant_id),
    averageRating: product.average_rating ?? null,
    reviewCount: product.review_count ?? 0,
    tags: Array.isArray(product.tags) ? product.tags : [],
  }
}

const toCartLineItem = (item: ApiCartLineItem): CartLineItem => {
  const quantity = item.quantity ?? 1
  const unitPrice = readNumber(item.unit_price) ?? readNumber(item.total) ?? 0
  const total = readNumber(item.total) ?? unitPrice * quantity
  const metadata = item.metadata ?? {}
  const selectedOptions =
    readSelectedOptions(item.selected_options).length ? readSelectedOptions(item.selected_options) :
    readSelectedOptions(item.options).length ? readSelectedOptions(item.options) :
    readSelectedOptions(metadata.selected_options).length ? readSelectedOptions(metadata.selected_options) :
    readSelectedOptions(item.variant?.options)

  return {
    id: item.id ?? item.variant_id ?? `line-${Math.random().toString(36).slice(2)}`,
    title: item.title ?? readString(metadata.title) ?? readString(metadata.product_title) ?? readString(metadata.mc_product_title) ?? "Cart item",
    imageUrl: item.thumbnail ?? readString(metadata.image_url) ?? readString(metadata.mockup_image_url),
    quantity,
    unitPrice,
    total,
    variantId: item.variant_id,
    variantTitle: readString(item.variant_title) ?? readString(item.variant?.title) ?? readString(metadata.variant_title),
    productId: item.product_id ?? readString(metadata.mc_product_id),
    colorName: findOptionValue(selectedOptions, "color") ?? readString(item.color_name) ?? readString(metadata.color_name) ?? readString(item.color) ?? readString(metadata.color),
    sizeName: findOptionValue(selectedOptions, "size") ?? readString(item.size_name) ?? readString(metadata.size_name) ?? readString(item.size) ?? readString(metadata.size),
    selectedOptions,
    supplierColorId: readId(item.supplier_color_id) ?? readId(metadata.supplier_color_id),
    supplierSizeId: readId(item.supplier_size_id) ?? readId(metadata.supplier_size_id),
  }
}

const toStoreCart = (cart: ApiCart): StoreCart => {
  const items = (cart.items ?? []).map(toCartLineItem)
  const subtotal = readNumber(cart.subtotal) ?? items.reduce((sum, item) => sum + item.total, 0)
  const total = readNumber(cart.total) ?? subtotal
  return {
    id: cart.cart_id ?? cart.id ?? "",
    storeId: cart.store_id,
    email: cart.email,
    currencyCode: cart.currency_code ?? "usd",
    items,
    subtotal,
    total,
  }
}

export const fetchStoreProducts = async (): Promise<ProductLoadResult> => {
  try {
    const data = await apiFetch<ProductsResponse>("/store/products")
    const products = (data.products ?? []).map(toStoreProduct)
    if (!products.length) return { products: mockProducts, source: "mock", error: "Backend returned no products." }
    return { products, source: "backend" }
  } catch (error) {
    const message = describeApiError(error, "/store/products")
    return { products: mockProducts, source: "mock", error: message }
  }
}

export const fetchStoreProduct = async (productId: string): Promise<SingleProductLoadResult> => {
  try {
    const data = await apiFetch<ProductResponse>(`/store/products/${encodeURIComponent(productId)}`)
    if (!data.product) throw new Error("Backend returned no product.")
    return { product: toStoreProduct(data.product, 0), source: "backend" }
  } catch (error) {
    const fallback = mockProducts.find((product) => product.id === productId) ?? mockProducts[0]
    const message = describeApiError(error, `/store/products/${productId}`)
    return { product: fallback, source: "mock", error: message }
  }
}

export const createStoreCart = async (email?: string) => {
  const cart = await apiFetch<ApiCart>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ currency_code: "usd", customer_email: email }),
  })
  return toStoreCart(cart)
}

export const fetchStoreCart = async (cartId: string) => {
  const cart = await apiFetch<ApiCart>(`/store/carts/${encodeURIComponent(cartId)}`)
  return toStoreCart(cart)
}

export const addCartLineItem = async (cartId: string, variantId: string, quantity: number) => {
  await apiFetch(`/store/carts/${encodeURIComponent(cartId)}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
  return fetchStoreCart(cartId)
}

export const updateCartLineItem = async (cartId: string, lineId: string, quantity: number) => {
  const cart = await apiFetch<CartMutationResponse>(`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  })
  return toStoreCart(cart.cart ?? cart)
}

export const deleteCartLineItem = async (cartId: string, lineId: string) => {
  const cart = await apiFetch<CartMutationResponse>(`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`, {
    method: "DELETE",
  })
  return toStoreCart(cart.cart ?? cart)
}
