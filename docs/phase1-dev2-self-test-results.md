# Phase 1 Dev2 自测结果

- 时间: 2026-05-17T01:07:28Z
- BASE_URL: http://localhost:9000


## 步骤 1：获取测试商品

```bash
curl -s "http://localhost:9000/store/products" -H x-publishable-api-key: pk_57ab986d5b806bdc725f3b30435231678fecf84117070576065f2053d971f575 -H X-Store-Id: default_store
```
```json
{
  "store_id": "default_store",
  "count": 2,
  "products": [
    {
      "product_id": "prod_phase1_default",
      "store_id": "default_store",
      "title": "Phase1 Default Store Product",
      "description": "Phase1 self-test bridge product",
      "status": "published",
      "source": "manual",
      "ai_job_id": null,
      "prompt": null,
      "platform_product_id": null,
      "supplier_product_id": null,
      "medusa_product_id": "prod_01KRRZSBFXDE1N039XDSFS50TF",
      "medusa_variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
      "is_cart_addable": true,
      "design_image_url": null,
      "image_url": null,
      "tags": [
        "phase1",
        "self-test"
      ],
      "price": 19.99,
      "cost": 8.5,
      "variants": [],
      "category_ids": [],
      "metadata": {
        "phase1_self_test": true
      },
      "created_at": "2026-05-16T18:11:43.786Z",
      "updated_at": "2026-05-16T18:11:43.786Z"
    },
    {
      "product_id": "prod_mc_phase1_def",
      "store_id": "default_store",
      "title": "Phase1 Default MC",
      "description": null,
      "status": "published",
      "source": "manual",
      "ai_job_id": null,
      "prompt": null,
      "platform_product_id": null,
      "supplier_product_id": null,
      "medusa_product_id": "prod_phase1_def",
      "medusa_variant_id": "variant_phase1_def",
      "is_cart_addable": true,
      "design_image_url": null,
      "image_url": null,
      "tags": [],
      "price": 19.99,
      "cost": 8.5,
      "variants": [],
      "category_ids": [],
      "metadata": {},
      "created_at": "2026-05-16T17:55:41.089Z",
      "updated_at": "2026-05-16T17:55:41.089Z"
    }
  ]
}
```
- VARIANT_DEFAULT: `variant_01KRRZSBFX9ENR1X8YJBTMT2Y1`
- VARIANT_TEST: `variant_01KRRZSBGX6QSS7NSEZ288QEZK`

## 步骤 2：创建 default_store 购物车

```json
{
  "cart_id": "cart_01KRSQJK72ZWSZDGNMYF9MQ8NS",
  "store_id": "default_store",
  "id": "cart_01KRSQJK72ZWSZDGNMYF9MQ8NS",
  "region_id": "reg_phase1_us",
  "customer_id": null,
  "sales_channel_id": null,
  "email": null,
  "currency_code": "usd",
  "locale": null,
  "metadata": {
    "store_id": "default_store"
  },
  "completed_at": null,
  "shipping_address": null,
  "billing_address": null,
  "created_at": "2026-05-17T01:07:28.099Z",
  "updated_at": "2026-05-17T01:07:28.099Z",
  "deleted_at": null,
  "items": [],
  "credit_lines": [],
  "shipping_methods": [],
  "shipping_address_id": null,
  "billing_address_id": null
}
```
- cart_id (default): `cart_01KRSQJK72ZWSZDGNMYF9MQ8NS`

## 步骤 3：加购与跨店隔离

### 3.1 同店加购 — HTTP 200
```json
{
  "cart_id": "cart_01KRSQJK72ZWSZDGNMYF9MQ8NS",
  "store_id": "default_store",
  "line_item": {
    "id": "cali_01KRSQJK95R2350HXQ9PTK7MSP",
    "title": "Phase1 Default Bridge Product",
    "subtitle": "Default",
    "thumbnail": null,
    "quantity": 1,
    "variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
    "product_id": "prod_01KRRZSBFXDE1N039XDSFS50TF",
    "product_title": "Phase1 Default Bridge Product",
    "product_description": null,
    "product_subtitle": null,
    "product_type": null,
    "product_type_id": null,
    "product_collection": null,
    "product_handle": "phase1-default-bridge",
    "variant_sku": null,
    "variant_barcode": null,
    "variant_title": "Default",
    "variant_option_values": null,
    "requires_shipping": false,
    "is_discountable": true,
    "is_giftcard": false,
    "is_tax_inclusive": false,
    "is_custom_price": false,
    "metadata": {},
    "cart_id": "cart_01KRSQJK72ZWSZDGNMYF9MQ8NS",
    "raw_compare_at_unit_price": null,
    "raw_unit_price": {
      "value": "1999",
      "precision": 20
    },
    "created_at": "2026-05-17T01:07:28.165Z",
    "updated_at": "2026-05-17T01:07:28.165Z",
    "deleted_at": null,
    "compare_at_unit_price": null,
    "unit_price": 1999
  }
}
```
### 3.2 跨店加购 — HTTP 400 (预期 400 + CART_STORE_MISMATCH)
```json
{
  "error": {
    "code": "CART_STORE_MISMATCH",
    "message": "Product does not belong to current store"
  }
}
```

## 步骤 4–5：complete 下单

### complete — HTTP 200
```json
{
  "order_id": "order_01KRSQJKDTM9NHR0HWHPXGAX3W",
  "store_id": "default_store",
  "payment_provider_id": "pp_system_default",
  "payment_status": "paid",
  "fulfillment_status": "waiting",
  "order": {
    "id": "order_01KRSQJKDTM9NHR0HWHPXGAX3W",
    "display_id": 2,
    "custom_display_id": null,
    "region_id": "reg_phase1_us",
    "customer_id": null,
    "version": 1,
    "sales_channel_id": null,
    "status": "pending",
    "is_draft_order": false,
    "email": null,
    "currency_code": "usd",
    "locale": null,
    "no_notification": false,
    "metadata": {
      "store_id": "default_store",
      "payment_status": "paid",
      "fulfillment_status": "waiting",
      "payment_confirmed_at": "2026-05-17T01:07:28.377Z",
      "payment_confirmed_source": "non_stripe_provider_after_complete"
    },
    "canceled_at": null,
    "shipping_address": null,
    "billing_address": null,
    "created_at": "2026-05-17T01:07:28.314Z",
    "updated_at": "2026-05-17T01:07:28.378Z",
    "deleted_at": null
  }
}
```
- order_id: `order_01KRSQJKDTM9NHR0HWHPXGAX3W`
- payment_status: `paid`
- fulfillment_status: `waiting`

## 步骤 7：test_store 交叉隔离

### test 车 + default variant — HTTP 400
```json
{
  "error": {
    "code": "CART_STORE_MISMATCH",
    "message": "Product does not belong to current store"
  }
}
```
### test 头读 default 车 — HTTP 403（预期 403 CART_STORE_ACCESS_DENIED）
```json
{
  "error": {
    "code": "CART_STORE_ACCESS_DENIED",
    "message": "Cart does not belong to current store"
  }
}
```

## 测试通过 Checklist

- [x] 同店加购 200
- [x] 跨店加购 CART_STORE_MISMATCH
- [x] complete 生成订单
- [x] payment_status=paid (pp_system_default)
- [x] fulfillment 已进入 waiting/pushed/shipped

完成。结果已写入 `docs/phase1-dev2-self-test-results.md`。
