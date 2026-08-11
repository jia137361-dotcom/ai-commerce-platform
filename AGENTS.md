# CLAUDE.md

This file provides complete project context, development rules, architecture boundaries, workflow standards, and full phase roadmap for Claude when assisting with the CitiGoo repository.

---

# 1. Project Overview

Project name:

```text
CitiGoo / citigoo.app
```

Project type:

```text
AI Commerce + POD + Independent Store + Future Multi-store SaaS Platform
```

Core architecture:

```text
AI Product Generation
+ Platform Product Library
+ Independent Storefront
+ Stripe Payment
+ Supplier Fulfillment
+ Logistics Tracking
+ Future Multi-store SaaS
```

---

# 2. Core Positioning

CitiGoo is NOT currently building:

- Full Shopify SaaS
- Full Marketplace
- Full AI Agent Platform
- Full Marketing Automation System
- Full Multi-store SaaS

Current positioning:

```text
Current stage = default_store single-store MVP
Future architecture = multi-store SaaS ready
```

Meaning:

The platform currently behaves like:

```text
One AI POD independent store
```

But internally must already preserve:

- store_id
- supplier abstraction
- logistics abstraction
- fulfillment architecture
- AI job architecture
- multi-store upgrade path

---

# 3. Current Main Development Stage

Current active development stage:

```text
Phase 2A + Phase 2B
```

Where:

## Phase 2A

AI Product Generation + Print File + Product Draft

## Phase 2B

Supplier + Logistics Fulfillment

---

# 4. Current Real Goal

The current real target is:

```text
AI product generation
→ product draft
→ publish
→ buyer payment
→ supplier fulfillment
→ logistics shipment
→ tracking return
→ buyer tracking lookup
```

NOT:

- automatic Pinterest marketing
- TikTok automation
- 50 product batch generation
- full AI agents
- multi-store SaaS
- Stripe Connect

---

# 5. System Architecture

## Frontend Layer

### Buyer Storefront

Technology:

- Next.js
- React
- TailwindCSS

Responsibilities:

- storefront homepage
- product list
- product detail
- cart
- checkout
- order lookup
- tracking lookup

---

### Seller Dashboard

Responsibilities:

- dashboard
- AI product generation
- product management
- order management
- fulfillment tracking
- store settings

---

## Backend Layer

### MedusaJS Backend

Technology:

- Node.js
- TypeScript
- MedusaJS
- PostgreSQL

Responsibilities:

- Store
- Product
- Cart
- Checkout
- Order
- Payment
- Fulfillment
- Shipment
- Storefront API
- Admin API

---

## AI Worker Layer

Technology:

- Python
- DeepSeek
- Pillow
- Image Processing

Responsibilities:

- design generation
- mockup generation
- print file generation
- title generation
- description generation
- tags
- SEO
- price suggestion

---

## Infrastructure

Technology:

- PostgreSQL
- Redis
- Docker
- Stripe
- CDN
- Object Storage

Future:

- BullMQ
- Temporal
- Queue System

---

# 6. Core Architecture Rules

## All Core Data Must Be Store-aware

Every core entity must support:

```text
store_id
```

Including:

- products
- carts
- orders
- fulfillment_orders
- shipments
- ai_generation_jobs
- product_assets
- store_settings
- future marketing assets

---

## Never Hardcode Single Store Logic

Do NOT write:

```text
getAllProducts()
getAllOrders()
globalStoreSettings
```

Prefer:

```text
getProductsByStore(store_id)
getOrdersByStore(store_id)
getStoreSettings(store_id)
```

---

## Store Context Resolution

All APIs must use:

```ts
resolveCurrentStore(request)
```

Priority:

```text
1. X-Store-Id
2. Host Domain
3. DEFAULT_STORE_ID
```

---

# 7. Current Main Business Flow

## Complete Business Loop

```text
Seller enters prompt
→ select platform product
→ AI Worker generates design
→ generate print file
→ generate mockup
→ generate title/description/tags
→ create product draft
→ seller publish
→ storefront product visible
→ buyer add to cart
→ Stripe payment
→ order generated
→ fulfillment_order generated
→ push supplier
→ supplier production
→ logistics shipment
→ tracking return
→ buyer lookup tracking
```

---

# 8. Core Database Models

## stores

Store base information.

```sql
stores
- id
- name
- slug
- status
- created_at
```

---

## store_settings

```sql
store_settings
- id
- store_id
- logo
- banner
- seo
- support_email
```

---

## platform_products

Platform base products.

Required seeds:

- T-shirt
- Hoodie
- Mug
- Phone Case
- Poster
- Canvas

---

## products

Store products.

```sql
products
- id
- store_id
- platform_product_id
- supplier_product_id
- title
- description
- price
- tags
- variants
- source
- ai_job_id
- prompt
- design_image_url
- mockup_image_url
- print_file_url
```

---

## suppliers

Supplier abstraction.

```sql
suppliers
- id
- code
- name
- country
- status
- raw_json
```

---

## supplier_products

```sql
supplier_products
- id
- supplier_id
- supplier_product_id
- platform_product_id
- name
- category
- base_cost
- currency
- status
```

---

## supplier_product_variants

```sql
supplier_product_variants
- id
- supplier_product_id
- supplier_variant_id
- color
- size
- sku
- cost
- stock_status
```

---

## supplier_print_specs

```sql
supplier_print_specs
- id
- supplier_product_id
- supplier_variant_id
- print_position
- print_file_width
- print_file_height
- dpi
- accepted_formats
- safe_margin
- bleed
- color_mode
```

---

## ai_generation_jobs

```sql
ai_generation_jobs
- id
- store_id
- platform_product_id
- supplier_product_id
- prompt
- status
- current_step
- input_json
- output_json
- error_message
- created_product_id
```

Status flow:

```text
pending
running
completed
failed
```

---

## product_assets

```sql
product_assets
- id
- store_id
- product_id
- ai_job_id
- asset_type
- file_format
- url
- width
- height
- dpi
```

asset_type:

```text
design
mockup
print_file
```

---

## carts

```sql
carts
- id
- store_id
- customer_id
```

Rules:

- cart cannot contain products from another store

---

## orders

```sql
orders
- id
- store_id
- payment_status
- fulfillment_status
```

Rules:

- order inherits store_id from cart

---

## fulfillment_orders

```sql
fulfillment_orders
- id
- store_id
- order_id
- supplier_id
- supplier_order_id
- status
- payload_json
- response_json
```

Status:

```text
waiting
pushed
in_production
shipped
delivered
failed
```

---

## shipments

```sql
shipments
- id
- store_id
- order_id
- fulfillment_order_id
- carrier
- tracking_number
- tracking_url
- shipped_at
- delivered_at
```

---

# 9. Current API Requirements

## AI

```http
POST /ai/generate-product
```

Returns:

```json
{
  "design_image_url": "",
  "print_file_url": "",
  "mockup_image_url": "",
  "title": "",
  "description": "",
  "tags": [],
  "seo": {},
  "price_suggestion": 29.99
}
```

---

## Product Draft

```http
POST /admin/products/draft
```

---

## Platform Products

```http
GET /admin/platform-products
GET /store/platform-products
```

---

## Fulfillment

```http
POST /admin/orders/{order_id}/push-fulfillment
```

---

## Mock Shipment

```http
POST /admin/orders/{order_id}/mock-shipment
```

---

## Buyer Lookup

```http
GET /store/orders/lookup
```

---

## Tracking Lookup

```http
GET /store/orders/{order_id}/tracking
```

---

# 10. Team Responsibilities

---

# Developer 1

Responsibilities:

- Store foundation
- Platform products
- Product system
- Supplier base data
- Product draft
- Product publish

Main modules:

```text
platform_products
suppliers
supplier_products
supplier_product_variants
supplier_print_specs
platform_design_templates
products
```

Current target:

```text
T-shirt
Black / White
S / M / L / XL
front print
PNG print file
```

---

# Developer 2

Responsibilities:

- AI Worker
- Cart
- Checkout
- Stripe
- Order
- Fulfillment
- Logistics
- Tracking

Main modules:

```text
apps/ai-worker
cart
checkout
payment
order
fulfillment
shipment
```

Current focus:

- generate-product
- print file
- mockup
- tracking
- order item production data

---

# Developer 3

Responsibilities:

- Documentation
- Postman
- Seed
- Testing
- Store isolation
- Integration testing

Main modules:

```text
docs/
postman/
seed/
testing/
store-context/
```

Current focus:

- schema docs
- api docs
- fulfillment docs
- AI state machine docs
- isolation tests
- idempotency tests

---

# 11. Development Workflow

Repository structure:

```text
ai-commerce-platform/
  apps/
    medusa-backend/
    ai-worker/

  docs/
  postman/
  infra/
  scripts/
```

---

## Branching

```text
main
develop
feature/store-product
feature/cart-payment-order
feature/store-context-testing
```

Rules:

- never commit directly to main
- merge small working PRs
- develop must remain runnable

---

## PR Rules

Every PR must explain:

```text
what changed
which APIs changed
whether database changed
how tested
whether affects others
```

---

# 12. Required Validation

## TypeScript Validation

```bash
npx.cmd tsc --noEmit -p apps/medusa-backend/tsconfig.json
```

---

## Migration Validation

```bash
npm.cmd --workspace apps/medusa-backend run db:migrate
```

---

## Seed Validation

```bash
npm.cmd --workspace apps/medusa-backend run seed
```

---

## Required Manual Testing

```text
AI draft
→ publish
→ storefront
→ cart
→ Stripe
→ fulfillment
→ shipment
→ tracking
→ buyer lookup
```

---

# 13. Current Forbidden Scope

DO NOT build these now unless explicitly requested:

- Pinterest automation
- TikTok automation
- AI marketing agents
- AI influencer automation
- 50 product batch generation
- Stripe Connect
- Multi-store SaaS
- Marketplace
- Complex RBAC
- Automatic SSL
- OpenAPI platform
- Multi-supplier routing
- Real advanced supply-chain orchestration

These belong to:

```text
Phase 3+
```

---

# 14. Phase Roadmap

---

# Phase 0

Scope Freeze + Architecture Confirmation

Goal:

- freeze MVP scope
- prevent scope creep

Outputs:

- schema
- api docs
- store context docs
- Postman
- seed
- repo standards

---

# Phase 1

Single-store Transaction MVP

Goal:

```text
default_store transaction loop
```

Includes:

- products
- cart
- checkout
- Stripe
- order
- mock fulfillment
- tracking
- buyer lookup

---

# Phase 2A

AI Product Generation

Goal:

```text
real AI product generation
```

Includes:

- ai_generation_jobs
- print files
- mockups
- title generation
- description generation
- tags
- SEO
- price suggestions

---

# Phase 2B

Supplier + Logistics Fulfillment

Goal:

```text
supplier production
+ logistics shipment
+ tracking return
```

Includes:

- supplier_orders
- shipment
- tracking
- webhook
- retry
- idempotency

---

# Phase 3

1688 / Alibaba Dropshipping

Goal:

```text
multi-supplier sourcing
```

Includes:

- supplier adapters
- dropshipping
- export information
- logistics handoff

---

# Phase 4

Seller Dashboard Enhancement

Includes:

- dashboard
- analytics
- product management
- order management
- store settings
- domain management

---

# Phase 5

Buyer Storefront Enhancement

Includes:

- homepage
- SEO
- mobile
- cart optimization
- checkout optimization
- email notifications

---

# Phase 6

Multi-store SaaS

Includes:

- seller registration
- store creation
- store switching
- permissions
- multi-store isolation

---

# Phase 7

Super Admin

Includes:

- global stores
- global sellers
- AI management
- supplier management
- system settings

---

# Phase 8

OpenAPI + Webhook

Includes:

- API keys
- webhook
- scopes
- rate limits

---

# Phase 9

Payments + Monetization

Includes:

- subscription plans
- platform fees
- settlements
- Stripe Connect
- payouts

---

# Phase 10

Scale + Reliability

Includes:

- queues
- monitoring
- alerting
- CDN
- caching
- security
- AI cost control
- risk control

---

# 15. Current Most Important Conclusion

The project is NOT currently building the final AI SaaS platform.

The current real target is:

```text
AI Product
→ Publish
→ Buyer Payment
→ Supplier Fulfillment
→ Logistics Tracking
→ Buyer Lookup
```

while preserving future upgrade capability for:

```text
multi-store
multi-seller
multi-supplier
AI agents
OpenAPI
Marketplace
```

---

# 16. How Claude Should Assist

When helping this repository:

1. Do not redesign the project from scratch.
2. Do not confuse future roadmap with current implementation.
3. Keep current work focused on current active phases.
4. Preserve existing architecture direction.
5. Preserve original developer responsibilities.
6. Prefer minimal safe changes over large rewrites.
7. When asked “what next”, answer with:
   - next dev step
   - next PR step
   - next integration step
   - next testing step
8. When reviewing work:
   - verify scope
   - verify merge readiness
   - verify missing tests
   - verify isolation
9. Always remember:
   - current = default_store
   - future = multi-store SaaS
