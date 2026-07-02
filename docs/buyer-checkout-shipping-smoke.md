# Buyer Checkout Shipping Smoke

Date: 2026-06-18
Branch: `feature/buyer-frontend-integration`

## Scope

Batch 11 validates the real checkout path for carts containing at least one `requires_shipping=true` line item:

`clean cart -> address -> shipping options -> shipping method -> customer binding -> contact -> complete -> success -> authenticated orders`.

This batch does not implement refund/cancel, new checkout pages, or a redesigned checkout UI.

## Smoke Product

The originally requested variant:

- `variant_01KTKH18WFHSGH5MXG2YG74PXM`

was tested in a clean cart and produced:

- `line_item.requires_shipping=false`

It is therefore not valid for Batch 11 shippable checkout smoke.

Existing local data contains shippable variants:

- `variant_01KSNA40DZZ79AW9Z8EHHXPWTX`
  - product: `prod_01KSN9V8K5M0C86AH5HQXNKPVS`
  - title: `Bridge Unique AI Two 20260528020616`
  - store: `default_store`
  - published: yes
  - observed line item: `requires_shipping=true`
- `variant_01KSNA4090FRBTTF8173A17ZFM`
  - product: `prod_01KSN9V8HQR408G6GV6YC55TET`
  - title: `Bridge Unique AI One 20260528020616`
  - store: `default_store`
  - published: yes
  - observed line item: `requires_shipping=true`

## Address Root Cause

`PUT /store/carts/:cart_id/address` previously attempted to retrieve cart relations:

```ts
relations: ["items", "shipping_address", "billing_address", "region", "region.countries"]
```

The Cart Module `Cart` entity does not expose a `region` relation. MikroORM failed while preparing populate with:

```text
Cannot read properties of undefined (reading 'kind')
```

The fix removes unsupported cart `region` population and uses `cart.region_id` plus the Region Module to validate `country_code`.

## calculated_amount / kind Root Cause

- `calculated_amount`: `updateCartWorkflow` can trigger pricing recalculation on carts with existing line items. The address bridge keeps the standard workflow as the primary path and only falls back to Cart Module `updateCarts` for pricing recalculation errors.
- `kind`: this runtime error was caused by asking Cart Module to populate the unsupported `region` relation. It was not caused by `country_code=cn`.

The fallback payload now only writes:

- `email`
- `sales_channel_id` when needed
- `shipping_address: { ...shippingAddress }`

It does not auto-write `billing_address`, and it does not reuse the same mutable address object for shipping and billing.

## Shipping Option Contract

`GET /store/carts/:cart_id/shipping-options`

Response:

```json
{
  "cart_id": "cart_...",
  "store_id": "default_store",
  "shipping_options": [
    {
      "id": "so_...",
      "name": "Batch 11 Smoke Standard CN",
      "amount": 500,
      "currency_code": "usd",
      "provider_id": "manual_manual",
      "service_zone_id": "serzo_...",
      "shipping_profile_id": "sp_...",
      "data": {}
    }
  ],
  "requires_shipping_method": true
}
```

For shippable carts, `requires_shipping_method` is based on real cart line items, not on option count. If the cart requires shipping but no option is available, the response is:

```json
{
  "shipping_options": [],
  "requires_shipping_method": true
}
```

The frontend must keep Place Order disabled in this state.

## Shipping Method Contract

`POST /store/carts/:cart_id/shipping-methods`

Request:

```json
{
  "option_id": "so_..."
}
```

Response returns the updated cart, including `shipping_methods`.

The selected option is validated by Medusa `addShippingMethodToCartWorkflow`; invalid or profile-mismatched options are rejected by the workflow.

## Smoke Shipping Setup

A local setup script was added:

```bash
XDG_CONFIG_HOME="$PWD/.tmp/medusa-config" \
npm --workspace apps/medusa-backend exec -- \
  medusa exec ./src/scripts/batch11-shipping-smoke-setup.ts
```

The script creates or reuses:

- stock location: `Batch 11 Smoke Warehouse`
- fulfillment set: `Batch 11 Smoke Fulfillment`
- service zone: `Batch 11 Smoke China`
- provider-location link for `manual_manual`
- flat-rate shipping option for the actual smoke variant shipping profile

Set `BATCH11_SMOKE_VARIANT_ID` to override the default smoke variant.

## Runtime Progress

Completed runtime checks:

- backend started on `http://127.0.0.1:9000`
- clean cart created:
  - `cart_01KVBXE2V7JV1V9WDC3T83H9FK`
  - `region_id=reg_01KRMT56X5MCH0A9DTSNZ81GFW`
  - `sales_channel_id=sc_01KRECKG3QNQS36N4X1QGVRDVY`
  - `metadata.store_id=default_store`
- added shippable variant:
  - `variant_01KSNA40DZZ79AW9Z8EHHXPWTX`
  - line item `requires_shipping=true`
- saved CN shipping address:
  - HTTP 200
  - response included saved `shipping_address`
  - no `billing_address` was auto-written
- initial shipping option state:
  - HTTP 200
  - `requires_shipping_method=true`
  - `shipping_options=[]`
- smoke shipping data setup created:
  - `shipping_option_id=so_01KVBY3AEACJFB5AP1MWZYCFGN`
- shipping options after setup:
  - HTTP 200
  - `requires_shipping_method=true`
  - one option returned
- selected shipping method:
  - HTTP 200
  - `shipping_method_id=casm_01KVBY4XBNSQYMVYPZ38GER4H8`
- authenticated buyer session:
  - customer id `cus_01KVBY6M1AZ1WBB52PFCVJZXC4`
- cart customer binding:
  - HTTP 200
  - `cart.customer_id=cus_01KVBY6M1AZ1WBB52PFCVJZXC4`
- contact persistence:
  - HTTP 200
  - cart email persisted

Complete attempt with the first smoke shipping option returned:

```json
{
  "error": {
    "code": "CART_COMPLETE_ERROR",
    "message": "The cart items require shipping profiles that are not satisfied by the current shipping methods"
  }
}
```

The setup script was then fixed to create the shipping option for the actual smoke variant product shipping profile instead of a hard-coded default profile.

Final re-run of setup and complete was not executed in this session because further elevated local-network commands were blocked by the execution environment usage limit.

## Re-Verification Commands

After local elevated command access is available again:

```bash
XDG_CONFIG_HOME="$PWD/.tmp/medusa-config" \
BATCH11_SMOKE_VARIANT_ID=variant_01KSNA40DZZ79AW9Z8EHHXPWTX \
npm --workspace apps/medusa-backend exec -- \
  medusa exec ./src/scripts/batch11-shipping-smoke-setup.ts
```

Then create a new clean cart and repeat:

1. `POST /store/carts`
2. `POST /store/carts/:cart_id/line-items`
3. `PUT /store/carts/:cart_id/address`
4. `GET /store/carts/:cart_id/shipping-options`
5. `POST /store/carts/:cart_id/shipping-methods`
6. authenticated `POST /store/carts/:cart_id/customer`
7. `PUT /store/carts/:cart_id/contact`
8. `POST /store/carts/:cart_id/complete`
9. `GET /store/customers/me/orders`
10. authenticated order detail

## Frontend State Machine

The checkout page now relies on these states:

- `requiresShippingMethod`
- `addressSaved`
- `shippingOptions`
- `selectedShippingOptionId`
- `shippingMethodSaved`
- `contactIsValid`
- `auth.customer`
- `placingOrder`

For `requires_shipping=true` carts, Place Order remains disabled until address save and shipping method save both succeed.

For `requires_shipping=false` carts, shipping option selection is not required and the previous flow remains valid.

## Known Limitations

- Product list/detail can include optional `requires_shipping`, but this Medusa runtime does not expose `requires_shipping` directly on `product_variant`; the authoritative smoke check remains the added cart line item.
- Final complete success for `requires_shipping=true` must be re-run after the fixed smoke setup script creates an option matching the smoke product shipping profile.
- Guest shippable checkout was not fully re-smoked in this session; guest contact/address/shipping APIs remain supported by the same routes.
