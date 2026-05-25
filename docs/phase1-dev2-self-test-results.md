# Phase 1 Dev2 自测结果

- 时间: 2026-05-20T15:22:39Z
- BASE_URL: http://localhost:9000


## 步骤 1：获取测试商品

```bash
curl -s "http://localhost:9000/store/products" -H x-publishable-api-key: pk_4220af4c6499ba6727cd55432fc228437378faf5180756dcb0a7a970d3bba408 -H X-Store-Id: default_store
```
```json
{
  "store_id": "default_store",
  "count": 4,
  "products": [
    {
      "product_id": "prod_01KS2ZKVEQT8NAD9DB67Y47C64",
      "store_id": "default_store",
      "title": "Custom Design — phase2a e2e minimal cat",
      "description": "Premium print-on-demand product featuring your design: phase2a e2e minimal cat. Soft fabric, vibrant print, made to order.",
      "status": "published",
      "source": "ai",
      "ai_job_id": "job_349c58bfddee4161",
      "prompt": "phase2a e2e minimal cat",
      "supplier_id": "sup_citigoo_mock",
      "platform_product_id": "pp_tshirt",
      "supplier_product_id": "sp_tshirt",
      "supplier_variant_id": "spv_tshirt_black_m",
      "medusa_product_id": "prod_01KRRZSBFXDE1N039XDSFS50TF",
      "medusa_variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
      "is_cart_addable": true,
      "design_image_url": "http://localhost:8001/static/design_a2dc40fd943e451ea13dc31d6e0cf028.png",
      "mockup_image_url": "http://localhost:8001/static/mockup_b33815b2f0904142aba8c401d8317050.png",
      "print_file_url": "http://localhost:8001/static/print_fc9643e9a8d94cb4a8ff7030fa436b7f.png",
      "image_url": "http://localhost:8001/static/mockup_b33815b2f0904142aba8c401d8317050.png",
      "tags": [
        "custom",
        "pod",
        "ai-generated",
        "t-shirt"
      ],
      "price": 21.25,
      "cost": 8.5,
      "variants": [],
      "category_ids": [],
      "metadata": {
        "seo": {
          "title": "Custom Design — phase2a e2e minimal cat",
          "description": "Premium print-on-demand product featuring your design: phase2a e2e minimal cat. Soft fabric, vibrant print, made to order."
        },
        "print_position": "front",
        "ai_worker_mock_mode": true
      },
      "created_at": "2026-05-20T15:21:07.799Z",
      "updated_at": "2026-05-20T15:21:07.850Z"
    },
    {
      "product_id": "prod_01KS2Z55YSAGQ64V1C2JGC774K",
      "store_id": "default_store",
      "title": "Custom Design — phase2a e2e minimal cat",
      "description": "Premium print-on-demand product featuring your design: phase2a e2e minimal cat. Soft fabric, vibrant print, made to order.",
      "status": "published",
      "source": "ai",
      "ai_job_id": "job_ffa7d3cb77504807",
      "prompt": "phase2a e2e minimal cat",
      "supplier_id": "sup_citigoo_mock",
      "platform_product_id": "pp_tshirt",
      "supplier_product_id": "sp_tshirt",
      "supplier_variant_id": "spv_tshirt_black_m",
      "medusa_product_id": "prod_01KRRZSBFXDE1N039XDSFS50TF",
      "medusa_variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
      "is_cart_addable": true,
      "design_image_url": "http://localhost:8001/static/design_4d321bb725f24ea2956203ec29f59a06.png",
      "mockup_image_url": "http://localhost:8001/static/mockup_6b6e072a39824056a0b981d008ab8923.png",
      "print_file_url": "http://localhost:8001/static/print_e6841feca4c34611a2f94c84565e2a10.png",
      "image_url": "http://localhost:8001/static/mockup_6b6e072a39824056a0b981d008ab8923.png",
      "tags": [
        "custom",
        "pod",
        "ai-generated",
        "t-shirt"
      ],
      "price": 21.25,
      "cost": 8.5,
      "variants": [],
      "category_ids": [],
      "metadata": {
        "seo": {
          "title": "Custom Design — phase2a e2e minimal cat",
          "description": "Premium print-on-demand product featuring your design: phase2a e2e minimal cat. Soft fabric, vibrant print, made to order."
        },
        "print_position": "front",
        "ai_worker_mock_mode": true
      },
      "created_at": "2026-05-20T15:13:07.034Z",
      "updated_at": "2026-05-20T15:13:07.100Z"
    },
    {
      "product_id": "prod_01KRV81A1PMN96GVMXG0W5DAJ2",
      "store_id": "default_store",
      "title": "Smoke Default Product 20260517231421-21916",
      "description": "Dev3 smoke product for default store",
      "status": "published",
      "source": "manual",
      "ai_job_id": null,
      "prompt": null,
      "supplier_id": null,
      "platform_product_id": null,
      "supplier_product_id": null,
      "supplier_variant_id": null,
      "medusa_product_id": null,
      "medusa_variant_id": null,
      "is_cart_addable": false,
      "design_image_url": null,
      "mockup_image_url": null,
      "print_file_url": null,
      "image_url": null,
      "tags": [
        "dev3-smoke"
      ],
      "price": 11.11,
      "cost": null,
      "variants": [],
      "category_ids": [
        "cat_01KRV819XP5PRGTSR4ED7HGFC9"
      ],
      "metadata": {
        "smoke": true
      },
      "created_at": "2026-05-17T15:14:21.878Z",
      "updated_at": "2026-05-17T15:14:21.946Z"
    },
    {
      "product_id": "prod_phase1_default",
      "store_id": "default_store",
      "title": "Phase1 Default Store Product",
      "description": "Phase1 self-test bridge product",
      "status": "published",
      "source": "manual",
      "ai_job_id": null,
      "prompt": null,
      "supplier_id": null,
      "platform_product_id": null,
      "supplier_product_id": null,
      "supplier_variant_id": null,
      "medusa_product_id": "prod_01KRRZSBFXDE1N039XDSFS50TF",
      "medusa_variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
      "is_cart_addable": true,
      "design_image_url": null,
      "mockup_image_url": null,
      "print_file_url": null,
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
    }
  ]
}
```
- VARIANT_DEFAULT: `variant_01KRRZSBFX9ENR1X8YJBTMT2Y1`
- VARIANT_TEST: `variant_01KRRZSBGX6QSS7NSEZ288QEZK`

## 步骤 2：创建 default_store 购物车

```json
{
  "cart_id": "cart_01KS2ZPN8X50VT422RQ3D24WYN",
  "store_id": "default_store",
  "id": "cart_01KS2ZPN8X50VT422RQ3D24WYN",
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
  "created_at": "2026-05-20T15:22:39.773Z",
  "updated_at": "2026-05-20T15:22:39.773Z",
  "deleted_at": null,
  "items": [],
  "credit_lines": [],
  "shipping_methods": [],
  "shipping_address_id": null,
  "billing_address_id": null
}
```
- cart_id (default): `cart_01KS2ZPN8X50VT422RQ3D24WYN`

## 步骤 3：加购与跨店隔离

### 3.1 同店加购 — HTTP 200
```json
{
  "cart_id": "cart_01KS2ZPN8X50VT422RQ3D24WYN",
  "store_id": "default_store",
  "line_item": {
    "id": "cali_01KS2ZPNC57JVPGZ7N9B9THRV2",
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
    "metadata": {
      "size": "M",
      "color": "black",
      "supplier_id": "sup_citigoo_mock",
      "print_file_url": "http://localhost:8001/static/print_fc9643e9a8d94cb4a8ff7030fa436b7f.png",
      "print_position": "front",
      "supplier_product_id": "sp_tshirt",
      "supplier_variant_id": "spv_tshirt_black_m"
    },
    "cart_id": "cart_01KS2ZPN8X50VT422RQ3D24WYN",
    "raw_compare_at_unit_price": null,
    "raw_unit_price": {
      "value": "1999",
      "precision": 20
    },
    "created_at": "2026-05-20T15:22:39.878Z",
    "updated_at": "2026-05-20T15:22:39.878Z",
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
  "order_id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
  "store_id": "default_store",
  "payment_provider_id": "pp_system_default",
  "payment_status": "paid",
  "fulfillment_status": "waiting",
  "order": {
    "id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
    "display_id": 5,
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
      "payment_confirmed_at": "2026-05-20T15:22:40.215Z",
      "mc_fulfillment_status": "waiting",
      "payment_confirmed_source": "non_stripe_provider_after_complete"
    },
    "canceled_at": null,
    "shipping_address": null,
    "billing_address": null,
    "created_at": "2026-05-20T15:22:40.120Z",
    "updated_at": "2026-05-20T15:22:40.217Z",
    "deleted_at": null
  }
}
```
- order_id: `order_01KS2ZPNKQ6611S0QYWYHH6XPE`
- payment_status: `paid`
- fulfillment_status: `waiting`

## 步骤 6：Admin 推履约 / mock 物流

### push-fulfillment — HTTP 200
```json
{
  "order_id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
  "store_id": "default_store",
  "fulfillment_order": {
    "id": "01KS2ZPNPBGMNV8QBM3SVBR2ME",
    "order_id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
    "store_id": "default_store",
    "payment_collection_id": "pay_col_01KS2ZPNHS159P2CRYFX4GWH3M",
    "supplier": "mock",
    "supplier_order_id": "MOCK-SUP-d7549f31",
    "payload": {
      "note": "mock_push",
      "line_items": [
        {
          "metadata": {
            "size": "M",
            "color": "black",
            "supplier_id": "sup_citigoo_mock",
            "print_file_url": "http://localhost:8001/static/print_fc9643e9a8d94cb4a8ff7030fa436b7f.png",
            "print_position": "front",
            "supplier_product_id": "sp_tshirt",
            "supplier_variant_id": "spv_tshirt_black_m"
          },
          "quantity": 1,
          "variant_id": "variant_01KRRZSBFX9ENR1X8YJBTMT2Y1",
          "line_item_id": "ordli_01KS2ZPNKRAX4CFDXT9RD8ZC2D"
        }
      ]
    },
    "pushed_at": "2026-05-20T15:22:40.295Z",
    "failed_reason": null,
    "status": "pushed",
    "created_at": "2026-05-20T15:22:40.203Z",
    "updated_at": "2026-05-20T15:22:40.298Z",
    "deleted_at": null
  }
}
```
### mock-shipment — HTTP 200
```json
{
  "order_id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
  "store_id": "default_store",
  "fulfillment_order_id": "01KS2ZPNPBGMNV8QBM3SVBR2ME",
  "shipment": {
    "id": "01KS2ZPNTRNX1N2XEBY3VBNMAS",
    "store_id": "default_store",
    "order_id": "order_01KS2ZPNKQ6611S0QYWYHH6XPE",
    "fulfillment_order_id": "01KS2ZPNPBGMNV8QBM3SVBR2ME",
    "carrier": "mock",
    "tracking_number": "MOCK-001",
    "tracking_url": "https://example.com/track/MOCK-001",
    "shipped_at": "2026-05-20T15:22:40.343Z",
    "delivered_at": null,
    "status": "shipped",
    "created_at": "2026-05-20T15:22:40.344Z",
    "updated_at": "2026-05-20T15:22:40.344Z",
    "deleted_at": null
  }
}
```

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
