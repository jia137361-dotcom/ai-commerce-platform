export type ProductRegionSummary = {
  region_id: string
  name: string
  currency_code: string
  country_codes: string[]
}

export type StoreProduct = {
  id: string
  title: string
  category: string
  categoryIds?: string[]
  price: string
  numericPrice?: number
  imageUrl: string
  mockupImageUrl?: string
  designImageUrl?: string
  printFileUrl?: string
  badge?: string
  description?: string
  medusaProductId?: string
  medusaVariantId?: string
  requiresShipping?: boolean
  supportedRegionIds?: string[]
  supportedRegions?: ProductRegionSummary[]
  supportedRegionsLabel?: string
  supplierId?: string
  supplierProductId?: string
  supplierVariantId?: string
  isCartAddable?: boolean
  averageRating?: number | null
  reviewCount?: number
  tags?: string[]
  variants?: BuyerProductVariant[]
}

export type BuyerProductVariant = {
  id: string
  title: string
  inventoryQuantity?: number
  manageInventory?: boolean
  allowBackorder?: boolean
  isPurchasable: boolean
}

export type CartLineItem = {
  id: string
  title: string
  imageUrl?: string
  quantity: number
  unitPrice: number
  total: number
  hasUnitPrice?: boolean
  hasTotal?: boolean
  variantId?: string
  variantTitle?: string
  productId?: string
  colorName?: string
  sizeName?: string
  selectedOptions?: SelectedOption[]
  supplierColorId?: string
  supplierSizeId?: string
}

export type SelectedOption = {
  name: string
  value: string
}

export type StoreCartShippingAddress = {
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  postalCode?: string
  countryCode?: string
}

export type StoreCart = {
  id: string
  regionId?: string
  storeId?: string
  email?: string
  customerId?: string | null
  currencyCode: string
  items: CartLineItem[]
  subtotal: number
  total: number
  hasSubtotal?: boolean
  hasTotal?: boolean
  shippingAddress?: StoreCartShippingAddress | null
}

export type Review = {
  id: string
  user: string
  location: string
  date: string
  rating: number
  text: string
  product: StoreProduct
  likes: number
}

export type OrderStatus = "processing" | "shipped" | "delivered" | "returns"

export type OrderItem = {
  id: string
  title: string
  imageUrl: string
  price: string
  quantity: number
  afterSales: string
}

export type Order = {
  id: string
  date: string
  placedAt: string
  storeName: string
  status: OrderStatus
  paidStatus: string
  action: string
  items: OrderItem[]
  address: {
    name: string
    line1: string
    line2: string
    phone: string
  }
  payment: {
    subtotal: string
    shipping: string
    discount: string
    total: string
    method: string
  }
  milestone: string
  tracking: string
}

export const categories = [
  "Bowls & Feeders",
  "Carriers & Travel Products",
  "Pet Apparel & Accessories",
  "Grooming Supplies",
  "Toys & Entertainment",
  "Bedding & Furniture",
]

export const mockProducts: StoreProduct[] = [
  {
    id: "prod-orbit-bag",
    title: "Minimal Orbit Leather Shoulder Bag",
    category: "Ready-to-Wear",
    price: "$128.00",
    numericPrice: 128,
    badge: "Best Seller",
    imageUrl: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80",
    description: "A structured city bag with warm hardware and refined proportions.",
    medusaVariantId: "mock-variant-orbit-bag",
    isCartAddable: false,
    averageRating: 4.8,
    reviewCount: 126,
  },
  {
    id: "prod-silk-set",
    title: "Ivory Silk Lounge Set",
    category: "Exotic Collection",
    price: "$96.00",
    numericPrice: 96,
    badge: "Limited",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    description: "Soft tailoring for daily elegance and late-afternoon plans.",
    medusaVariantId: "mock-variant-silk-set",
    isCartAddable: false,
    averageRating: 4.6,
    reviewCount: 84,
  },
  {
    id: "prod-runner",
    title: "Amber Trim Urban Runner",
    category: "Footwear",
    price: "$74.00",
    numericPrice: 74,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    description: "Lightweight profile with a cushioned sole and orange accent.",
    isCartAddable: false,
    averageRating: 4.5,
    reviewCount: 42,
  },
  {
    id: "prod-feeder",
    title: "Ceramic Elevated Feeder Set",
    category: "Bowls & Feeders",
    price: "$42.00",
    numericPrice: 42,
    badge: "New",
    imageUrl: "https://images.unsplash.com/photo-1601758063541-d2f50b4aafb2?auto=format&fit=crop&w=900&q=80",
    description: "Low-glare ceramic bowls on a clean wood stand.",
    isCartAddable: false,
    averageRating: 4.9,
    reviewCount: 18,
  },
  {
    id: "prod-carrier",
    title: "Airline Ready Soft Travel Carrier",
    category: "Carriers & Travel Products",
    price: "$68.00",
    numericPrice: 68,
    imageUrl: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=900&q=80",
    description: "Breathable panels, padded handles, and tidy storage.",
    isCartAddable: false,
    averageRating: 4.4,
    reviewCount: 31,
  },
  {
    id: "prod-groom",
    title: "Spa Grooming Essentials Kit",
    category: "Grooming Supplies",
    price: "$36.00",
    numericPrice: 36,
    imageUrl: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80",
    description: "Daily coat care in a compact kit.",
    isCartAddable: false,
    averageRating: 4.7,
    reviewCount: 24,
  },
  {
    id: "prod-bed",
    title: "Cloud Rest Boucle Pet Bed",
    category: "Bedding & Furniture",
    price: "$84.00",
    numericPrice: 84,
    badge: "Top Rated",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
    description: "Supportive cushion with washable boucle cover.",
    isCartAddable: false,
    averageRating: 4.9,
    reviewCount: 57,
  },
  {
    id: "prod-toy",
    title: "Quiet Play Enrichment Set",
    category: "Toys & Entertainment",
    price: "$29.00",
    numericPrice: 29,
    imageUrl: "https://images.unsplash.com/photo-1589469526983-0882135d3cb8?auto=format&fit=crop&w=900&q=80",
    description: "A composed set of tactile toys for relaxed indoor play.",
    isCartAddable: false,
    averageRating: 4.3,
    reviewCount: 15,
  },
]

export const reviews: Review[] = [
  {
    id: "rev-1",
    user: "l***u",
    location: "Los Angeles, CA",
    date: "May 22, 2026",
    rating: 5,
    text: "The finish feels premium and the package arrived earlier than expected. The store support team was quick and thoughtful.",
    product: mockProducts[0],
    likes: 124,
  },
  {
    id: "rev-2",
    user: "m***a",
    location: "Austin, TX",
    date: "May 18, 2026",
    rating: 4,
    text: "Beautiful design, accurate color, and very careful packaging. I would love a few more size choices.",
    product: mockProducts[3],
    likes: 86,
  },
  {
    id: "rev-3",
    user: "c***9",
    location: "Seattle, WA",
    date: "May 11, 2026",
    rating: 5,
    text: "Clean look and sturdy materials. It matches the store photos and feels more expensive than the price.",
    product: mockProducts[4],
    likes: 57,
  },
]

export const orders: Order[] = [
  {
    id: "CG-20260602-1008",
    date: "Jun 2, 2026",
    placedAt: "June 2, 2026 10:42 AM",
    storeName: "Citigoo Official Store",
    status: "shipped",
    paidStatus: "Buyer Paid",
    action: "Confirm delivery",
    items: [
      {
        id: "line-1",
        title: "Minimal Orbit Leather Shoulder Bag",
        imageUrl: mockProducts[0].imageUrl,
        price: "$128.00",
        quantity: 1,
        afterSales: "After-sales/refund available",
      },
      {
        id: "line-2",
        title: "Amber Trim Urban Runner",
        imageUrl: mockProducts[2].imageUrl,
        price: "$74.00",
        quantity: 1,
        afterSales: "Return protection included",
      },
    ],
    address: {
      name: "lulu",
      line1: "1188 Market Street",
      line2: "San Francisco, CA 94103, United States",
      phone: "+1 415 *** 0188",
    },
    payment: {
      subtotal: "$202.00",
      shipping: "$8.00",
      discount: "-$12.00",
      total: "$198.00",
      method: "Visa ending in 0428",
    },
    milestone: "Package departed regional sorting facility at 8:12 AM.",
    tracking: "CGX778182640US",
  },
  {
    id: "CG-20260516-0831",
    date: "May 16, 2026",
    placedAt: "May 16, 2026 3:18 PM",
    storeName: "Citigoo Official Store",
    status: "delivered",
    paidStatus: "Buyer Paid",
    action: "Follow-up Review",
    items: [
      {
        id: "line-3",
        title: "Ceramic Elevated Feeder Set",
        imageUrl: mockProducts[3].imageUrl,
        price: "$42.00",
        quantity: 1,
        afterSales: "Refund period ends soon",
      },
    ],
    address: {
      name: "lulu",
      line1: "1188 Market Street",
      line2: "San Francisco, CA 94103, United States",
      phone: "+1 415 *** 0188",
    },
    payment: {
      subtotal: "$42.00",
      shipping: "$6.00",
      discount: "$0.00",
      total: "$48.00",
      method: "Visa ending in 0428",
    },
    milestone: "Delivered to mailbox on May 20, 2026.",
    tracking: "CGX112904731US",
  },
]
