# Buyer Product Detail Design Notes

Date: 2026-06-15

Branch: `experiment/buyer-plus-supplier-runtime`

Scope: Batch 2 visual judgment for rebuilding `/products/:product_id`.

## Summary

The primary product detail reference is `designs/buyer-ui/单店/60.png`.

The design set mixes product detail, shop information, product listing, search overlay, category overlay, and account/contact overlay states. For Batch 2, the implementation should use the shared storefront chrome already built for `/store`, then recreate the product-detail sections visible in `60.png`: campaign hero blocks, product media, title, rating, option selectors, price, delivery copy, description, Add To Cart, recommendations, share block, and footer.

## Image Inventory

| File | Role | Notes |
| --- | --- | --- |
| `designs/buyer-ui/单店/57.png` | Store About page | Store biography, announcements, store info, business location, features, offers, and footer. Not a product detail screen. Useful only for shared top chrome/footer tone. |
| `designs/buyer-ui/单店/58.png` | Store policies page | Shop policies accordion view with the shared Nespresso hero and toolbar. Not a product detail screen. |
| `designs/buyer-ui/单店/59.png` | Category side drawer state | Right-side category drawer over store policies. Not part of Batch 2 product detail. |
| `designs/buyer-ui/单店/60.png` | Main product detail long page | Primary reference. Shows the full product detail journey: campaign banner, promo tiles, product rail, repeated detail modules, options, price, delivery date, description, Add To Cart, recommendations, share, footer. |
| `designs/buyer-ui/单店/61.png` | Product detail with contact/QR panel | Same long product detail page with an account/contact popover on the right. Treat as overlay state, not P0 for Batch 2. |
| `designs/buyer-ui/单店/62.png` | Search overlay with history | Search modal over product listing page. Not product detail core. |
| `designs/buyer-ui/单店/63.png` | Search overlay compact state | Search modal over product listing page with collapsed history. Not product detail core. |
| `designs/buyer-ui/单店/64.png` | Product detail with account/settings panel | Same long product detail page with account/settings dropdown. Treat as overlay state, not P0 for Batch 2. |
| `designs/buyer-ui/单店/65.png` | Store policies dropdown state | Nespresso Machines dropdown over policies page. Not product detail. |
| `designs/buyer-ui/单店/66.png` | Product listing long page | Store product grid with See More and footer. Already closer to Batch 1 `/store`, not product detail. |

## Product Detail UI Requirements From `60.png`

- Header/top bar: keep the Batch 1 storefront chrome style.
- Campaign hero: large Nespresso/Samra promotional block above product content.
- Product media: large product image area with carousel dots/arrows.
- Purchase panel: brand/category label, long product title, rating, option selectors, price, delivery timing, description, secondary details button, and yellow Add To Cart button.
- Detail layout: image-left/text-right and text-left/image-right alternating modules appear in the long page. Batch 2 can implement one hero product module plus supporting static campaign/product tiles.
- Recommendations: horizontal recommendation tiles near the bottom.
- Share: small centered share action before footer.
- Footer: reuse the Citigoo-style footer visual from `/store`.

## State Mapping

- Main loaded state: `60.png`
- Contact/share/account overlay variants: `61.png`, `64.png`
- Search overlay states: `62.png`, `63.png`
- Category/menu states: `59.png`, `65.png`
- Store policies/about/listing states: `57.png`, `58.png`, `66.png`

## Implementation Notes

- Product identity, title, price, description, media, rating, review count, store linkage, and cart readiness must come from real APIs first.
- Visual option selectors can be rendered statically until backend exposes true variants/options. They must not change `medusa_variant_id`.
- Reviews can fall back to mock reviews only when the reviews API fails, and the fallback reason must be logged with `console.warn`.
- Share data should use `/store/products/:product_id/share`; if it fails, use a local product URL fallback and log the reason.
- Add To Cart must use `product.medusa_variant_id` and a store-scoped cart id key.
