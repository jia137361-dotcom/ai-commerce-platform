## API 01: Upload Material

### Basic Info

| Field      | Value                                      |
| ---------- | ------------------------------------------ |
| API Name   | Upload Material                            |
| Group      | Material                                   |
| Method     | POST                                       |
| Path       | `/open/v1/material/uploadMaterial`         |
| Full URL   | `{{host}}/open/v1/material/uploadMaterial` |
| Encoding   | utf-8                                      |
| Status     | Published                                  |
| Updated At | 2026-05-21 14:50:24                        |

### Description

上传素材图片。素材图片用于后续设计产品生成流程。

This endpoint uploads a design material image. The uploaded material is used as the image asset for creating designed supplier products.

### Auth

| Field         | Value                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth Required | LIKELY YES                                                                                                                                                                                       |
| Auth Header   | `Authorization: Bearer <token>`                                                                                                                                                                  |
| Notes         | Eolink page does not explicitly show request headers for this endpoint, but supplier business APIs generally require the access token returned by `/open/v1/accessToken`. Verify during testing. |

### Content Type

```http
multipart/form-data
```

### Request Parameters

| Name    | Required | Type   | Description                                                                       |
| ------- | -------: | ------ | --------------------------------------------------------------------------------- |
| `image` |      yes | file   | Binary image file stream. Allowed formats: `jpg`, `png`, `jpeg`. Max size: 20 MB. |
| `name`  |       no | string | Material name.                                                                    |

### Path / REST Parameters

| Name   | Required | Type   | Description                         |
| ------ | -------: | ------ | ----------------------------------- |
| `host` |      yes | string | API host, configured as `{{host}}`. |

### Request Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/material/uploadMaterial" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -F "image=@logs/supplier-single-store-YYYYMMDD-HHMMSS/assets/test-design.png" \
  -F "name=CitiGoo dry-run test material" | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 51853,
    "name": "小猫",
    "image_url": "https://imagetest.s2bdiy.com/material/2026-04-15/69df408921dc9.png"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "a55f1093-eb3b-4b01-ba75-fcd9a4908461"
}
```

### Success Response Fields

| Field            | Type   | Description                          |
| ---------------- | ------ | ------------------------------------ |
| `data.id`        | int    | Material ID / 素材编号                   |
| `data.name`      | string | Material name / 素材名称                 |
| `data.image_url` | string | Material image URL / 素材图片链接          |
| `msg`            | string | Response message                     |
| `status`         | string | Response status, expected `success`  |
| `status_code`    | int    | Business status code, expected `200` |
| `time`           | int    | Response time                        |
| `uuid`           | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Eolink note: more error codes are described on the API documentation home page.

### Dry-run Safety

| Check                        | Value                                                    |
| ---------------------------- | -------------------------------------------------------- |
| Creates supplier product?    | NO                                                       |
| Creates supplier order?      | NO                                                       |
| Charges money?               | NO                                                       |
| Safe for no-payment dry-run? | YES                                                      |
| Can be repeated?             | LIKELY YES, but should verify duplicate upload behavior. |

### Validation Points

During supplier dry-run, verify:

1. `multipart/form-data` upload works.
2. Transparent PNG is accepted.
3. File under 20 MB is accepted.
4. Response contains `data.id`.
5. Response contains `data.image_url`.
6. Invalid token returns a clear auth error.
7. Invalid file format returns a clear validation error.
8. Oversized file greater than 20 MB is rejected.
9. Re-uploading the same image either succeeds with a new material ID or returns a documented duplicate behavior.

### Fields Needed by Later Steps

The following fields should be saved locally for later Create Product flow:

```text
supplier_asset_id = data.id
supplier_asset_url = data.image_url
supplier_asset_name = data.name
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/upload-material.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field   | CitiGoo Suggested Field   |
| ---------------- | ------------------------- |
| `data.id`        | `supplier_asset_id`       |
| `data.image_url` | `supplier_asset_url`      |
| `data.name`      | `supplier_asset_name`     |
| full response    | `supplier_asset_raw_json` |

### Implementation Notes for Codex

* Use `FormData` / multipart upload.
* Do not send JSON body for this endpoint.
* Mask `Authorization` token in logs.
* Save full raw response for debugging.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

## API 02: Calculate Products

### Basic Info

| Field      | Value                                |
| ---------- | ------------------------------------ |
| API Name   | Calculate Products                   |
| Group      | Logistics                            |
| Method     | GET                                  |
| Path       | `/open/v1/calculateProducts`         |
| Full URL   | `{{host}}/open/v1/calculateProducts` |
| Encoding   | utf-8                                |
| Status     | Published                            |
| Updated At | 2026-05-29 17:01:53                  |

### Description

多产品运费试算。对指定产品进行运费试算，以获取预估物流成本信息。

This endpoint estimates logistics/shipping cost for one or more supplier products.

### Auth

| Field         | Value                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth Required | LIKELY YES                                                                                                                                                    |
| Auth Header   | `Authorization: Bearer <token>`                                                                                                                               |
| Notes         | Eolink page does not explicitly show headers here, but supplier business APIs generally require the token from `/open/v1/accessToken`. Verify during testing. |

### Request Method Warning

Eolink marks this endpoint as `GET`, but the request example is shown as a JSON object.

This is potentially ambiguous. During implementation, verify whether S2BDIY expects:

1. GET query parameters;
2. GET with encoded nested params;
3. POST-style JSON body despite the documented method being GET.

Do not guess silently. If the first request fails, log the exact format used and the supplier error response.

### Request Parameters

| Name                           | Required | Type   | Description                                                           |
| ------------------------------ | -------: | ------ | --------------------------------------------------------------------- |
| `products[].product_id`        |      yes | int    | Supplier product ID / 产品 ID                                           |
| `products[].stock_sku_item_id` |      yes | int    | Stock SKU item ID / 库存项 ID                                            |
| `products[].num`               |      yes | int    | Quantity / 数量                                                         |
| `platform`                     |       no | int    | Third-party platform channel. See `Third platform channels` document. |
| `country`                      |      yes | string | Country code, for example `CN`, `CA`, `US`                            |
| `province`                     |      yes | string | Province / state, for example `北京`, `Quebec`                          |
| `city`                         |      yes | string | City, for example `北京`, `Trois-Rivières`                              |
| `postcode`                     |      yes | string | Postal code                                                           |
| `ioss_number`                  |       no | string | EU IOSS number                                                        |

### Request Example From Eolink

```json
{
  "products": [
    {
      "product_id": 11907,
      "stock_sku_item_id": 2731,
      "num": 1
    },
    {
      "product_id": 3803,
      "stock_sku_item_id": 6328,
      "num": 12
    }
  ],
  "platform": 99,
  "country": "CA",
  "province": "Quebec",
  "city": "Trois-Rivières",
  "postcode": "G8Y0H8",
  "ioss_number": "IM3720000224"
}
```

### Possible curl Example: Query Parameter Style

Use this only if S2BDIY confirms nested query parameter format.

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/calculateProducts" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "products[0][product_id]=11907" \
  --data-urlencode "products[0][stock_sku_item_id]=2731" \
  --data-urlencode "products[0][num]=1" \
  --data-urlencode "platform=99" \
  --data-urlencode "country=CA" \
  --data-urlencode "province=Quebec" \
  --data-urlencode "city=Trois-Rivières" \
  --data-urlencode "postcode=G8Y0H8" \
  --data-urlencode "ioss_number=IM3720000224" | jq .
```

### Possible curl Example: JSON Body Style

Use this only if S2BDIY accepts JSON body for this documented `GET` endpoint.

```bash
curl -sS -X GET "$S2BDIY_BASE_URL/open/v1/calculateProducts" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "product_id": 11907,
        "stock_sku_item_id": 2731,
        "num": 1
      }
    ],
    "platform": 99,
    "country": "CA",
    "province": "Quebec",
    "city": "Trois-Rivières",
    "postcode": "G8Y0H8"
  }' | jq .
```

### Success Response Example

```json
{
  "data": [
    {
      "id": 13,
      "name": "递四方物流普货-100",
      "logistics_platform_id": 365,
      "en_name": "4px-QX",
      "full_en_name": "4PX Logistics General Cargo - 100",
      "day_from": 1,
      "day_to": 3,
      "amount": "0.50",
      "min_amount": "8.60",
      "max_amount": "8.60"
    }
  ],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "a7fda210-569b-4752-a9e6-7fbb5c5a302e"
}
```

### Success Response Fields

| Field                          | Type           | Description                          |
| ------------------------------ | -------------- | ------------------------------------ |
| `data[].id`                    | int            | Logistics rule ID / 规则编号             |
| `data[].name`                  | string         | Logistics channel name / 渠道名称        |
| `data[].logistics_platform_id` | int            | Logistics platform/channel ID / 渠道编号 |
| `data[].en_name`               | string         | Logistics channel English name       |
| `data[].full_en_name`          | string         | Full logistics channel English name  |
| `data[].day_from`              | int            | Minimum estimated delivery days      |
| `data[].day_to`                | int            | Maximum estimated delivery days      |
| `data[].amount`                | decimal string | Estimated logistics cost / 预估物流费用    |
| `data[].min_amount`            | decimal string | Minimum estimated logistics cost     |
| `data[].max_amount`            | decimal string | Maximum estimated logistics cost     |
| `msg`                          | string         | Response message                     |
| `status`                       | string         | Response status, expected `success`  |
| `status_code`                  | int            | Business status code, expected `200` |
| `time`                         | int            | Response time                        |
| `uuid`                         | string         | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Eolink note: more error codes are described on the API documentation home page.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Correct request format for `products[]`.
2. Correct behavior with valid `product_id` and `stock_sku_item_id`.
3. Response contains at least one logistics option.
4. Each logistics option contains `logistics_platform_id`.
5. Each logistics option contains estimated cost fields: `amount`, `min_amount`, `max_amount`.
6. Invalid token returns a clear auth error.
7. Invalid `product_id` returns a clear product error.
8. Invalid `stock_sku_item_id` returns a clear SKU/item error.
9. Missing address fields return clear validation errors.
10. Country/province/city/postcode affect returned logistics options and prices.

### Fields Needed by Later Steps

The following fields should be saved locally for later order creation or logistics selection:

```text
logistics_rule_id = data[].id
logistics_platform_id = data[].logistics_platform_id
logistics_name = data[].name
logistics_en_name = data[].en_name
shipping_amount = data[].amount
shipping_min_amount = data[].min_amount
shipping_max_amount = data[].max_amount
estimated_day_from = data[].day_from
estimated_day_to = data[].day_to
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/calculate-products.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                 | CitiGoo Suggested Field             |
| ------------------------------ | ----------------------------------- |
| `data[].id`                    | `supplier_logistics_rule_id`        |
| `data[].logistics_platform_id` | `supplier_logistics_platform_id`    |
| `data[].name`                  | `supplier_logistics_name`           |
| `data[].amount`                | `estimated_shipping_cost`           |
| `data[].min_amount`            | `estimated_shipping_min_cost`       |
| `data[].max_amount`            | `estimated_shipping_max_cost`       |
| full response                  | `supplier_logistics_quote_raw_json` |

### Implementation Notes for Codex

* This endpoint should be used before order payment to estimate logistics cost.
* Do not treat this as final payable amount; final amount should still be confirmed by order detail/pricing after order creation.
* Preserve amount fields as decimal strings or convert using a safe decimal library.
* Do not use floating point arithmetic for money.
* Mask `Authorization` token in logs.
* Save full raw response for debugging.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.
* Verify whether the request must be sent as query parameters or JSON body.

## API 03: Get Design SDK

### Basic Info

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| API Name       | Get design SDK                                |
| Group          | Design SDK                                    |
| Method         | GET                                           |
| Path           | `/singleDesign`                               |
| Production URL | `https://opensdk.s2bdiy.com/singleDesign`     |
| Test URL       | `https://opensdktest.s2bdiy.com/singleDesign` |
| Encoding       | utf-8                                         |
| Status         | Published                                     |
| Updated At     | 2025-12-02 14:16:43                           |

### Description

S2B 平台设计器 SDK。官方建议通过 `iframe` 引入。用户可以在设计器中选择基础产品进行设计，保存后可在产品列表中获取设计后的产品信息。

This is a frontend iframe-based product designer SDK. It is used for manual/seller-side design workflows, not direct backend API dry-run.

### Auth

| Field          | Value                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth Required  | YES                                                                                                                                                         |
| Auth Parameter | `token` query parameter                                                                                                                                     |
| Token Source   | `/open/v1/accessToken`                                                                                                                                      |
| Notes          | Unlike Open API calls that use `Authorization: Bearer <token>`, this iframe SDK passes token as query parameter. Avoid logging full token in frontend logs. |

### Query Parameters

| Name             |    Required | Type   | Description                                                        |
| ---------------- | ----------: | ------ | ------------------------------------------------------------------ |
| `token`          |         yes | string | Access token / 访问凭证                                                |
| `basicProductId` | conditional | int    | Basic product ID. Required for single product design.              |
| `productId`      | conditional | int    | Product ID. Required for redesigning an existing designed product. |

### Parameter Rules

| Scenario                  | Required Parameters       |
| ------------------------- | ------------------------- |
| Single product design     | `token`, `basicProductId` |
| Redesign existing product | `token`, `productId`      |

### iframe Example From Eolink

```html
<iframe
  src="https://opensdktest.s2bdiy.com/singleDesign?token=1a52450e24c96669525304fb09f1e038&basicProductId=874"
  width="1500px"
  id="myIframe"
  ref="myIframe">
</iframe>
```

### Safer iframe Example With Placeholder

```html
<iframe
  src="https://opensdktest.s2bdiy.com/singleDesign?token=<S2BDIY_ACCESS_TOKEN>&basicProductId=<BASIC_PRODUCT_ID>"
  width="1500px"
  id="s2bdiyDesignerIframe">
</iframe>
```

### Response / Callback Behavior

```text
TODO_FROM_EOLINK
```

Need to confirm from Eolink or supplier:

1. Whether the iframe sends `postMessage` events to the parent page.
2. What event is emitted after design save.
3. Whether saved design returns `productId`.
4. Whether parent frontend must poll Product API after save.
5. Whether token expiration inside iframe is handled gracefully.

### Dry-run Safety

| Check                                | Value                                    |
| ------------------------------------ | ---------------------------------------- |
| Creates supplier product?            | POSSIBLY YES, after user saves design    |
| Creates supplier order?              | NO                                       |
| Charges money?                       | LIKELY NO                                |
| Safe for backend no-payment dry-run? | NOT APPLICABLE                           |
| Safe for frontend manual test?       | YES, if test SDK and test token are used |

### Validation Points

For frontend integration, verify:

1. Test SDK URL opens successfully.
2. Token query parameter is accepted.
3. `basicProductId` opens the expected product.
4. User can save a design.
5. Saved design appears in Product list API.
6. Redesign flow works with `productId`.
7. Token expiration behavior is clear.
8. iframe can be embedded in CitiGoo frontend without CORS/frame blocking.
9. Any `postMessage` event is documented and handled safely.
10. Full token is not stored in frontend logs.

### Fields Needed by Later Steps

If using iframe design flow, the frontend/backend must eventually obtain:

```text
supplier_product_id = productId returned by SDK or Product list/detail API
basic_product_id = basicProductId used to launch SDK
```

### Local Raw Response Save Path

Not applicable for backend curl dry-run.

If manually testing iframe, record notes/screenshots under:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/sdk/
```

### Mapping to CitiGoo Internal Fields

| SDK Field        | CitiGoo Suggested Field          |
| ---------------- | -------------------------------- |
| `basicProductId` | `supplier_basic_product_id`      |
| `productId`      | `supplier_product_id`            |
| SDK URL          | `supplier_design_sdk_url`        |
| SDK save result  | `supplier_design_sdk_raw_result` |

### Implementation Notes for Codex

* Do not use this endpoint for backend-only dry-run unless the project explicitly supports browser automation.
* This is useful for future frontend design UI.
* Do not expose long-lived supplier token directly to untrusted clients without confirming supplier security model.
* If frontend must use this SDK, prefer generating a short-lived session token or proxying token creation through backend if supported.
* Need to inspect SDK save/callback documentation before implementing production frontend flow.
* This endpoint should not be part of the first no-payment backend dry-run.

## API 04: Get Basic Product Detail

### Basic Info

| Field            | Value                                |
| ---------------- | ------------------------------------ |
| API Name         | Get basic product detail             |
| Group            | Basic product                        |
| Method           | GET                                  |
| Path             | `/open/v1/basicProduct/{id}`         |
| Example Full URL | `{{host}}/open/v1/basicProduct/1657` |
| Encoding         | utf-8                                |
| Status           | Published                            |
| Updated At       | 2026-05-22 17:08:31                  |

### Description

获取基础选品详情，包含基础产品列表接口之外的详细选品信息。

This endpoint retrieves detailed information for a selected basic product, including colors, sizes, variants/items, print views, print areas, product images, price, material, shipping attributes, and category information.

If the basic product is offline/unavailable, the API may return empty data.

### Auth

| Field         | Value                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth Required | LIKELY YES                                                                                                                                                    |
| Auth Header   | `Authorization: Bearer <token>`                                                                                                                               |
| Notes         | Eolink page does not explicitly show headers here, but supplier business APIs generally require the token from `/open/v1/accessToken`. Verify during testing. |

### Path Parameters

| Name | Required | Type       | Description             |
| ---- | -------: | ---------- | ----------------------- |
| `id` |      yes | string/int | Basic product ID / 选品编号 |

### Request Example

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/basicProduct/$BASIC_PRODUCT_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

This is an abridged example. The full Eolink example contains long HTML descriptions and product image arrays.

```json
{
  "data": {
    "id": 874,
    "code": "HSPJKI",
    "name": "圆形拼图",
    "en_name": "Round wooden puzzle",
    "purchase_price": "20.06",
    "views": [
      {
        "id": 1,
        "name": "A面",
        "en_name": "View A"
      }
    ],
    "colors": [
      {
        "id": 6,
        "name": "白色",
        "en_name": "White",
        "tone": "#FFFFFF"
      }
    ],
    "sizes": [
      {
        "id": 325,
        "name": "120 PCS",
        "en_name": "120 PCS"
      },
      {
        "id": 326,
        "name": "68 PCS",
        "en_name": "68PCS"
      }
    ],
    "items": [
      {
        "id": 3387,
        "code": "DHNAOC",
        "size_id": 325,
        "color_id": 6,
        "price": "21.25",
        "weight": 130,
        "length": "14.00",
        "width": "10.00",
        "height": "3.50"
      }
    ],
    "print_areas": [
      {
        "view_id": 1,
        "width": "545.82",
        "height": "230.54"
      }
    ],
    "product_show_master_image": "https://snb-bucket.oss-cn-hangzhou.aliyuncs.com/showImages/LO6WB6_6_1.jpg",
    "produce_country": "CN",
    "warehouse_name": "国内总控",
    "transport_types_arr": [
      "含电",
      "纺织品",
      "口罩"
    ],
    "product_technology_text": "UV喷印",
    "product_material_text": "杨木",
    "deliver_goods_text": "1-3天",
    "categorys": [
      {
        "id": 238,
        "name": "母婴玩具",
        "en_name": "Maternal and infant toys"
      }
    ]
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "85cf4177-771e-4ba7-9d50-7a49fdc8b31e"
}
```

### Success Response Fields

#### Basic Product Fields

| Field                             | Type   | Description                                                 |
| --------------------------------- | ------ | ----------------------------------------------------------- |
| `data.id`                         | int    | Basic product ID / 选品编号                                     |
| `data.code`                       | string | Basic product code / 选品编码                                   |
| `data.name`                       | string | Product name / 选品名称                                         |
| `data.en_name`                    | string | English product name                                        |
| `data.purchase_price`             | string | Base purchase price / 选品采购价格                                |
| `data.desc`                       | string | Chinese product description, often HTML                     |
| `data.en_desc`                    | string | English product description, often HTML                     |
| `data.product_technology_text`    | string | Production technology                                       |
| `data.en_product_technology_text` | string | Production technology in English                            |
| `data.product_material_text`      | string | Material                                                    |
| `data.en_product_material_text`   | string | Material in English                                         |
| `data.deliver_goods_text`         | string | Production / dispatch lead time                             |
| `data.produce_country`            | string | Production country code                                     |
| `data.produce_country_text`       | string | Production country name                                     |
| `data.warehouse_name`             | string | Warehouse / factory name                                    |
| `data.ship_address`               | string | Shipping warehouse detail. May not exist for every product. |

#### Print View Fields

| Field                  | Type   | Description                |
| ---------------------- | ------ | -------------------------- |
| `data.views[]`         | array  | Print surface list / 打印面列表 |
| `data.views[].id`      | int    | Print view ID / 打印面编号      |
| `data.views[].name`    | string | Print view name            |
| `data.views[].en_name` | string | Print view English name    |

#### Color Fields

| Field                   | Type   | Description        |
| ----------------------- | ------ | ------------------ |
| `data.colors[]`         | array  | Color list         |
| `data.colors[].id`      | int    | Color ID           |
| `data.colors[].name`    | string | Color name         |
| `data.colors[].en_name` | string | English color name |
| `data.colors[].tone`    | string | Hex color value    |

#### Size Fields

| Field                  | Type   | Description       |
| ---------------------- | ------ | ----------------- |
| `data.sizes[]`         | array  | Size list         |
| `data.sizes[].id`      | int    | Size ID           |
| `data.sizes[].name`    | string | Size name         |
| `data.sizes[].en_name` | string | English size name |

#### Variant / Item Fields

| Field                   | Type   | Description                                                                                     |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `data.items[]`          | array  | Variant list / 变体列表                                                                             |
| `data.items[].id`       | int    | Variant ID. This is likely `stock_sku_item_id` for logistics/order APIs. Verify during testing. |
| `data.items[].code`     | string | Variant code                                                                                    |
| `data.items[].size_id`  | int    | Size ID                                                                                         |
| `data.items[].color_id` | int    | Color ID                                                                                        |
| `data.items[].price`    | string | Variant purchase price                                                                          |
| `data.items[].weight`   | int    | Weight in grams                                                                                 |
| `data.items[].length`   | string | Length in cm                                                                                    |
| `data.items[].width`    | string | Width in cm                                                                                     |
| `data.items[].height`   | string | Height in cm                                                                                    |

#### Print Area Fields

| Field                        | Type   | Description              |
| ---------------------------- | ------ | ------------------------ |
| `data.print_areas[]`         | array  | Design/print areas       |
| `data.print_areas[].view_id` | int    | Print view ID            |
| `data.print_areas[].width`   | string | Design area width in px  |
| `data.print_areas[].height`  | string | Design area height in px |

#### Product Image Fields

| Field                                         | Type   | Description                             |
| --------------------------------------------- | ------ | --------------------------------------- |
| `data.product_show_images[]`                  | array  | Product display images grouped by color |
| `data.product_show_images[].color_id`         | int    | Color ID                                |
| `data.product_show_images[].color_name`       | string | Color name                              |
| `data.product_show_images[].tone`             | string | Hex color value                         |
| `data.product_show_images[].images[].src`     | string | Small image URL, usually 500px          |
| `data.product_show_images[].images[].big_src` | string | Large image URL, usually 1200px         |
| `data.product_show_master_image`              | string | Product master image URL                |

#### Packaging / Size Specification Fields

| Field                                  | Type   | Description              |
| -------------------------------------- | ------ | ------------------------ |
| `data.size_specifications[]`           | array  | Packaging specifications |
| `data.size_specifications[].size_id`   | int    | Size ID                  |
| `data.size_specifications[].size_name` | string | Size name                |
| `data.size_specifications[].weight`    | string | Weight                   |
| `data.size_specifications[].length`    | string | Package length in cm     |
| `data.size_specifications[].width`     | string | Package width in cm      |
| `data.size_specifications[].height`    | string | Package height in cm     |
| `data.size_specifications[].volume`    | string | Package volume in cm³    |

#### Category / Transport Fields

| Field                        | Type   | Description                                                                               |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `data.categorys[]`           | array  | Product category path                                                                     |
| `data.categorys[].id`        | int    | Category ID                                                                               |
| `data.categorys[].name`      | string | Category name                                                                             |
| `data.categorys[].en_name`   | string | English category name                                                                     |
| `data.transport_types_arr[]` | array  | Special transport attributes. Empty means normal goods. Examples: battery, textile, mask. |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Eolink note: more error codes are described on the API documentation home page.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid `basic_product_id` returns non-empty `data`.
2. Offline or invalid product returns empty data or a clear error.
3. `colors[]` is present.
4. `sizes[]` is present.
5. `items[]` is present.
6. `print_areas[]` is present.
7. `views[]` is present.
8. A target color can be selected, preferably `Black` or `White`.
9. A target size can be selected, preferably `M`.
10. A matching item can be found by `color_id + size_id`.
11. `items[].id` can be used as `stock_sku_item_id` in logistics/order APIs.
12. A target print surface can be selected, preferably `Front`.
13. `print_areas[].view_id` matches the selected `views[].id`.
14. Design area width and height are available.
15. Product price and variant price are available.
16. Product status / offline behavior is clear.

### Fields Needed by Later Steps

The following fields should be saved locally for product generation, logistics quote, and order creation:

```text
supplier_basic_product_id = data.id
supplier_basic_product_code = data.code
supplier_basic_product_name = data.name
supplier_basic_product_en_name = data.en_name
supplier_purchase_price = data.purchase_price

selected_color_id = data.colors[].id
selected_color_name = data.colors[].name
selected_color_en_name = data.colors[].en_name

selected_size_id = data.sizes[].id
selected_size_name = data.sizes[].name
selected_size_en_name = data.sizes[].en_name

selected_stock_sku_item_id = data.items[].id
selected_stock_sku_item_code = data.items[].code
selected_variant_price = data.items[].price
selected_variant_weight = data.items[].weight
selected_variant_length = data.items[].length
selected_variant_width = data.items[].width
selected_variant_height = data.items[].height

selected_view_id = data.views[].id or data.print_areas[].view_id
selected_view_name = data.views[].name
selected_print_area_width = data.print_areas[].width
selected_print_area_height = data.print_areas[].height

supplier_product_master_image = data.product_show_master_image
supplier_transport_types = data.transport_types_arr
supplier_raw_basic_product_detail = full response
```

### Selection Logic for T-shirt Dry-run

For the single-store supplier dry-run, Codex should use this selection logic:

```text
1. Call basic product list and select a T-shirt-like basic product.
2. Call this detail endpoint with selected basic_product_id.
3. Prefer color:
   - Black
   - White
   - first available color if Black/White not available
4. Prefer size:
   - M
   - L
   - S
   - XL
   - first available size if standard apparel sizes are not available
5. Find matching item:
   item.color_id == selected_color_id
   item.size_id == selected_size_id
6. Treat item.id as candidate stock_sku_item_id.
7. Prefer print view:
   - Front
   - 正面
   - A面
   - first available view if Front/A面 not available
8. Match print_areas[].view_id to selected view id.
9. Use print_areas width/height to generate test PNG.
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/basic-product-detail.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                   | CitiGoo Suggested Field                  |
| -------------------------------- | ---------------------------------------- |
| `data.id`                        | `supplier_basic_product_id`              |
| `data.code`                      | `supplier_basic_product_code`            |
| `data.name`                      | `supplier_basic_product_name`            |
| `data.en_name`                   | `supplier_basic_product_en_name`         |
| `data.purchase_price`            | `supplier_base_purchase_price`           |
| `data.colors[]`                  | `supplier_color_options_json`            |
| `data.sizes[]`                   | `supplier_size_options_json`             |
| `data.items[]`                   | `supplier_variant_items_json`            |
| `data.items[].id`                | `supplier_stock_sku_item_id`             |
| `data.views[]`                   | `supplier_print_views_json`              |
| `data.print_areas[]`             | `supplier_print_areas_json`              |
| `data.product_show_master_image` | `supplier_basic_product_image_url`       |
| full response                    | `supplier_basic_product_detail_raw_json` |

### Implementation Notes for Codex

* This endpoint is required before material upload/product generation if the dry-run needs exact design area dimensions.
* Do not assume the product is a T-shirt from this example; this Eolink example is a puzzle product.
* The dry-run should select a T-shirt from the basic product list first, then call this endpoint for that T-shirt.
* Treat `items[].id` as the likely `stock_sku_item_id`, but verify with Create Order / Calculate Products docs.
* Preserve all money fields as strings or safe decimals.
* Preserve full raw response for debugging.
* Strip or sanitize HTML only for display; keep original `desc` and `en_desc` in raw JSON.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

## API 05: Get Authorization / Access Token

### Basic Info

| Field      | Value                          |
| ---------- | ------------------------------ |
| API Name   | Get authorization              |
| Group      | User                           |
| Method     | POST                           |
| Path       | `/open/v1/accessToken`         |
| Full URL   | `{{host}}/open/v1/accessToken` |
| Encoding   | utf-8                          |
| Status     | Published                      |
| Updated At | 2026-05-22 17:08:00            |

### Method Warning

Eolink page header shows:

```text
HTTP GET {{host}}/open/v1/accessToken
```

But the request method section says:

```text
请求方式: POST
```

The body example is also JSON:

```json
{"app_key":"xxx", "app_secret":"xxxx"}
```

Therefore, implementation should treat this endpoint as:

```text
POST /open/v1/accessToken
```

If POST fails, verify with supplier whether GET is supported or whether the Eolink header is incorrect.

### Description

获取授权接口。根据返回的 token，在后续需要授权的接口请求头中加入：

```http
Authorization: Bearer <token>
```

This endpoint obtains the supplier access token using `app_key` and `app_secret`. The token is required for other authorized supplier APIs.

### Auth

| Field                         | Value                   |
| ----------------------------- | ----------------------- |
| Auth Required                 | NO                      |
| Credentials Required          | `app_key`, `app_secret` |
| Auth Header for This Endpoint | Not required            |
| Token Validity                | 3 days                  |

### Content Type

```http
Content-Type: application/json
```

### Request Body Parameters

| Name         | Required | Type   | Description               |
| ------------ | -------: | ------ | ------------------------- |
| `app_key`    |      yes | string | Application key / 应用标记    |
| `app_secret` |      yes | string | Application secret / 应用密钥 |

### Request Example From Eolink

```json
{
  "app_key": "xxx",
  "app_secret": "xxxx"
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/accessToken" \
  -H "Content-Type: application/json" \
  -d '{
    "app_key": "'"$S2BDIY_APP_KEY"'",
    "app_secret": "'"$S2BDIY_APP_SECRET"'"
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "token": "1a52450e24c96669525304fb09f1e038"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "f8073f84-a3c1-4b7e-9c3c-3150a8562705"
}
```

### Success Response Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `data.token`  | string | Access token / 访问凭证                  |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Token Usage

Use the returned token in later business API calls:

```http
Authorization: Bearer <token>
```

Example:

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/basicProduct" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Token Validity

| Field               | Value                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Validity            | 3 days                                                                                     |
| Suggested Cache TTL | 2.5 days                                                                                   |
| Refresh Strategy    | Refresh before expiration; retry once on 401 by clearing cache and requesting a new token. |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Wrong `app_key`.
2. Wrong `app_secret`.
3. Missing `app_key`.
4. Missing `app_secret`.
5. Invalid JSON body.
6. Repeated token request.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid `app_key + app_secret` returns `data.token`.
2. Token is accepted by at least one protected business API.
3. Token validity is approximately 3 days.
4. Wrong `app_secret` returns a clear error.
5. Missing credentials return a clear validation error.
6. Repeated token requests are allowed or documented.
7. Backend caches token instead of requesting a new token for every API call.
8. If a protected API returns 401, backend clears cached token and retries token acquisition once.

### Fields Needed by Later Steps

The following fields should be saved in memory or secure local cache:

```text
s2bdiy_access_token = data.token
s2bdiy_token_acquired_at = current timestamp
s2bdiy_token_expires_at = current timestamp + 3 days
```

Do not save full token in public logs.

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/access-token.json
```

The saved raw response must mask the token before writing to report files.

### Mapping to CitiGoo Internal Fields

| Supplier Field            | CitiGoo Suggested Field          |
| ------------------------- | -------------------------------- |
| `data.token`              | `supplier_access_token`          |
| token acquired time       | `supplier_token_acquired_at`     |
| token expiration estimate | `supplier_token_expires_at`      |
| full masked response      | `supplier_token_raw_json_masked` |

### Implementation Notes for Codex

* Use `POST`, not `GET`, unless supplier confirms otherwise.
* Send JSON body with `app_key` and `app_secret`.
* Never print `app_secret` or full token.
* Mask token in logs, for example `1a5245***2705`.
* Cache token for less than 3 days, preferably 2.5 days.
* Do not request a new token for every product/order API call.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.
## API 06: Create Child User

### Basic Info

| Field      | Value                           |
| ---------- | ------------------------------- |
| API Name   | Create user / Create child user |
| Group      | User                            |
| Method     | POST                            |
| Path       | `/open/v1/childUser`            |
| Full URL   | `{{host}}/open/v1/childUser`    |
| Encoding   | utf-8                           |
| Status     | Published                       |
| Updated At | 2026-01-09 11:11:56             |

### Description

快捷创建 S2B Open API 子用户。各子账号之间数据隔离。

This endpoint creates a child Open API user/account. The returned `app_key` and `app_secret` can be used to authenticate as that child account. Data is isolated between child accounts.

### Auth

| Field         | Value                                          |
| ------------- | ---------------------------------------------- |
| Auth Required | YES                                            |
| Auth Header   | `Authorization: Bearer <token>`                |
| Token Source  | `/open/v1/accessToken`                         |
| Notes         | Requires an existing valid parent/admin token. |

### Content Type

```http
Content-Type: application/json
```

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Request Body Parameters

| Name        | Required | Type   | Description      |
| ----------- | -------: | ------ | ---------------- |
| `username`  |      yes | string | Username / 用户名   |
| `user_role` |       no | string | Role name / 角色名称 |

### Request Example From Eolink

```json
{
  "username": "xxxxx"
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/childUser" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "citigoo-child-test-user"
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "app_key": "15980165893",
    "app_secret": "82106f7a0d39f16b66c689f088265cca"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "2f503395-b78d-4b3d-b081-41b65bac5db6"
}
```

### Success Response Fields

| Field             | Type   | Description                          |
| ----------------- | ------ | ------------------------------------ |
| `data.app_key`    | string | Child account app key                |
| `data.app_secret` | string | Child account app secret             |
| `msg`             | string | Response message                     |
| `status`          | string | Response status, expected `success`  |
| `status_code`     | int    | Business status code, expected `200` |
| `time`            | int    | Response time                        |
| `uuid`            | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing `Authorization`.
2. Invalid token.
3. Missing `username`.
4. Duplicate `username`.
5. Invalid `user_role`.
6. Unauthorized parent account.

### Dry-run Safety

| Check                                  | Value                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Creates supplier product?              | NO                                                                             |
| Creates supplier order?                | NO                                                                             |
| Charges money?                         | LIKELY NO                                                                      |
| Creates supplier account / credential? | YES                                                                            |
| Safe for no-payment supplier dry-run?  | NO                                                                             |
| Can be repeated?                       | UNKNOWN; duplicate username behavior must be tested manually only if approved. |

### Validation Points

This endpoint should only be tested when account provisioning is explicitly in scope.

If tested, verify:

1. Valid parent token can create a child user.
2. Response contains `data.app_key`.
3. Response contains `data.app_secret`.
4. Child credentials can request `/open/v1/accessToken`.
5. Child account data is isolated from other accounts.
6. Duplicate username behavior is clear.
7. Invalid token returns a clear auth error.
8. Missing username returns a clear validation error.
9. Returned `app_secret` is never printed to normal logs.

### Fields Needed by Later Steps

If child account creation is approved, save securely:

```text
child_app_key = data.app_key
child_app_secret = data.app_secret
child_username = request.username
```

Do not save full `app_secret` in public logs or reports.

### Local Raw Response Save Path

If manually tested:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/create-child-user.json
```

The saved report version must mask `data.app_secret`.

### Mapping to CitiGoo Internal Fields

| Supplier Field       | CitiGoo Suggested Field               |
| -------------------- | ------------------------------------- |
| `data.app_key`       | `supplier_child_app_key`              |
| `data.app_secret`    | `supplier_child_app_secret_encrypted` |
| request `username`   | `supplier_child_username`             |
| full masked response | `supplier_child_user_raw_json_masked` |

### Implementation Notes for Codex

* Do not call this endpoint in the default no-payment supplier dry-run.
* This endpoint changes supplier account state by creating a new child account.
* Only call when explicitly approved by a human operator.
* Mask `Authorization` token in logs.
* Mask returned `app_secret` in reports.
* Treat non-`status=success` or non-`status_code=200` as failure.
* If child account isolation is needed later for multi-store or multi-seller scenarios, this endpoint may become relevant.
* For current single-store supplier dry-run, use already provided `S2BDIY_APP_KEY` and `S2BDIY_APP_SECRET` instead.

## API 07: Get Basic Products

### Basic Info

| Field      | Value                           |
| ---------- | ------------------------------- |
| API Name   | Get basic products              |
| Group      | Basic product                   |
| Method     | GET                             |
| Path       | `/open/v1/basicProduct`         |
| Full URL   | `{{host}}/open/v1/basicProduct` |
| Encoding   | utf-8                           |
| Status     | Published                       |
| Updated At | 2026-05-22 16:56:57             |

### Description

获取选品列表。选品是基础产品模板，用户设计过后会生成产品。

This endpoint lists basic products / product templates. The dry-run uses it to find one simple T-shirt-like product before fetching full product details.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Query Parameters

| Name                  | Required | Type   | Description                                                          |
| --------------------- | -------: | ------ | -------------------------------------------------------------------- |
| `keyword`             |       no | string | Keyword / 关键词                                                        |
| `produce_area`        |       no | int    | Production area ID / 生产区域编号                                         |
| `produce_country`     |       no | string | Production country code, for example `CN` or `US` / 生产国家编码          |
| `category_id`         |       no | int    | Category ID / 分类编号                                                   |
| `purchase_price_sort` |       no | string | Price sort, allowed values: `asc`, `desc` / 价格排序                     |
| `codes`               |       no | string | Comma-separated basic product codes, e.g. `9YDDGD,X7CXT7,V62HBK` |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/basicProduct" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "keyword=T-shirt" \
  --data-urlencode "produce_country=US" \
  --data-urlencode "purchase_price_sort=asc" | jq .
```

### Request Example From Eolink

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/basicProduct" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "produce_country=US" \
  --data-urlencode "purchase_price_sort=asc" \
  --data-urlencode "codes=9YDDGD,X7CXT7,V62HBK,XORB6Z,JJMOIC" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 874,
        "code": "HSPJKI",
        "name": "圆形拼图",
        "en_name": "Round wooden puzzle",
        "views": [
          {
            "id": 1,
            "name": "A面",
            "en_name": "View A"
          }
        ],
        "colors": [
          {
            "id": 6,
            "name": "白色",
            "en_name": "White",
            "tone": "#FFFFFF"
          }
        ],
        "sizes": [
          {
            "id": 325,
            "name": "120 PCS",
            "en_name": "120 PCS"
          },
          {
            "id": 327,
            "name": "195PCS",
            "en_name": "195PCS"
          },
          {
            "id": 326,
            "name": "68 PCS",
            "en_name": "68PCS"
          }
        ],
        "purchase_price": 12.0,
        "produce_area": 1,
        "produce_area_text": "国内",
        "produce_country": "CN",
        "produce_country_text": "中国",
        "warehouse_name": "国内总控",
        "transport_types_arr": [
          "含电",
          "纺织品",
          "口罩"
        ],
        "view_image_src": "https://snb-bucket.oss-cn-hangzhou.aliyuncs.com/showImages/LO6WB6_6_1.jpg?x-oss-process=image/resize,m_lfit,limit_0,w_500/auto-orient,0/quality,Q_100",
        "design_product_image": "https://snb-bucket.oss-cn-hangzhou.aliyuncs.com/showImages/LO6WB6_6_1.jpg?x-oss-process=image/resize,m_lfit,limit_0,w_500/auto-orient,0/quality,Q_100"
      }
    ],
    "first_page_url": "/open/v1/basicProduct?page=1",
    "from": 1,
    "last_page": 1,
    "last_page_url": "/open/v1/basicProduct?page=1",
    "next_page_url": null,
    "path": "/open/v1/basicProduct",
    "per_page": 5,
    "prev_page_url": null,
    "to": 1,
    "total": 1
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "a43205ce-8d58-48cc-b575-f15267458081"
}
```

### Success Response Fields

#### Pagination Fields

| Field                  | Type   | Description            |
| ---------------------- | ------ | ---------------------- |
| `data.current_page`    | int    | Current page           |
| `data.data[]`          | array  | Basic product list     |
| `data.first_page_url`  | string | First page URL         |
| `data.from`            | int    | First item offset      |
| `data.last_page`       | int    | Last page number       |
| `data.last_page_url`   | string | Last page URL          |
| `data.next_page_url`   | string | Next page URL or null  |
| `data.path`            | string | API path               |
| `data.per_page`        | int    | Page size              |
| `data.prev_page_url`   | string | Previous page URL/null |
| `data.to`              | int    | Last item offset       |
| `data.total`           | int    | Total result count     |

#### Basic Product Fields

| Field                                  | Type           | Description                                  |
| -------------------------------------- | -------------- | -------------------------------------------- |
| `data.data[].id`                       | int            | Basic product ID / 选品编号                      |
| `data.data[].code`                     | string         | Basic product code / 选品编码                    |
| `data.data[].name`                     | string         | Basic product name / 选品名称                    |
| `data.data[].en_name`                  | string         | English product name / 选品英文名称              |
| `data.data[].purchase_price`           | string/number  | Purchase price / 选品采购价                      |
| `data.data[].produce_area`             | int            | Production area ID / 生产地区编号                |
| `data.data[].produce_area_text`        | string         | Production area name / 生产地区名称              |
| `data.data[].produce_country`          | string         | Production country code / 生产国家编码           |
| `data.data[].produce_country_text`     | string         | Production country name / 生产国家名称           |
| `data.data[].warehouse_name`           | string         | Warehouse/factory name / 仓库或工厂名称           |
| `data.data[].view_image_src`           | string         | Preview image URL / 预览图链接、宣传图             |
| `data.data[].design_product_image`     | string         | Default designed product image URL / 默认设计图 |
| `data.data[].transport_types_arr[]`    | array<string>  | Special transport attributes; empty means normal goods |

#### Print View Fields

| Field                         | Type   | Description             |
| ----------------------------- | ------ | ----------------------- |
| `data.data[].views[]`         | array  | Print surface list      |
| `data.data[].views[].id`      | int    | Print view ID / 打印面编号 |
| `data.data[].views[].name`    | string | Print view name         |
| `data.data[].views[].en_name` | string | Print view English name |

#### Color Fields

| Field                          | Type   | Description        |
| ------------------------------ | ------ | ------------------ |
| `data.data[].colors[]`         | array  | Color list         |
| `data.data[].colors[].id`      | int    | Color ID / 颜色编号   |
| `data.data[].colors[].name`    | string | Color name / 颜色名称 |
| `data.data[].colors[].en_name` | string | English color name |
| `data.data[].colors[].tone`    | string | Hex color value    |

#### Size Fields

| Field                         | Type   | Description       |
| ----------------------------- | ------ | ----------------- |
| `data.data[].sizes[]`         | array  | Size list         |
| `data.data[].sizes[].id`      | int    | Size ID / 尺码编号   |
| `data.data[].sizes[].name`    | string | Size name / 尺码名称 |
| `data.data[].sizes[].en_name` | string | English size name |

#### Envelope Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing `Authorization`.
2. Invalid token.
3. Invalid `produce_country`.
4. Invalid `category_id`.
5. Invalid `purchase_price_sort`.
6. Unknown `codes`.
7. Empty search results.
8. Pagination beyond the last page.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid token returns a paginated product list.
2. `keyword` search works for T-shirt-like terms.
3. `produce_country=US` and `produce_country=CN` behavior is clear.
4. `category_id` filter works if categories are available.
5. `purchase_price_sort=asc` sorts by price.
6. `codes` can fetch specific product codes.
7. Response contains `data.data[].id`.
8. Response contains names/images/prices needed for selection.
9. At least one T-shirt-like product can be found.
10. Missing/invalid token returns a clear auth error.

### Fields Needed by Later Steps

The following fields should be saved locally before calling Basic Product Detail:

```text
candidate_basic_product_id = data.data[].id
candidate_basic_product_code = data.data[].code
candidate_basic_product_name = data.data[].name
candidate_basic_product_en_name = data.data[].en_name
candidate_purchase_price = data.data[].purchase_price
candidate_preview_image_url = data.data[].view_image_src
candidate_design_product_image_url = data.data[].design_product_image
candidate_produce_country = data.data[].produce_country
candidate_warehouse_name = data.data[].warehouse_name
candidate_transport_types = data.data[].transport_types_arr
candidate_views = data.data[].views
candidate_colors = data.data[].colors
candidate_sizes = data.data[].sizes
```

### Selection Logic for T-shirt

For the single-store supplier dry-run, Codex should:

```text
1. Query with keyword values such as "T-shirt", "shirt", "tee", "短袖", "T恤".
2. Prefer a basic product whose name or en_name clearly indicates a T-shirt.
3. Prefer a product with both Black/White-like color options and standard apparel sizes.
4. Prefer sizes containing M, then L, S, XL, then first available.
5. Prefer Front, 正面, or A面 print view.
6. If the list endpoint lacks print area dimensions, call API 04 Get Basic Product Detail before generating PNG.
7. Do not test multiple categories in the first dry-run.
8. If no T-shirt-like product is found, mark `TODO_CONFIRM_WITH_SUPPLIER` and stop before upload/generation.
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/basic-products.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                         | CitiGoo Suggested Field                  |
| -------------------------------------- | ---------------------------------------- |
| `data.data[].id`                       | `supplier_basic_product_id`              |
| `data.data[].code`                     | `supplier_basic_product_code`            |
| `data.data[].name`                     | `supplier_basic_product_name`            |
| `data.data[].en_name`                  | `supplier_basic_product_en_name`         |
| `data.data[].purchase_price`           | `supplier_base_purchase_price`           |
| `data.data[].views[]`                  | `supplier_print_views_json`              |
| `data.data[].colors[]`                 | `supplier_color_options_json`            |
| `data.data[].sizes[]`                  | `supplier_size_options_json`             |
| `data.data[].view_image_src`           | `supplier_basic_product_image_url`       |
| `data.data[].design_product_image`     | `supplier_default_design_product_image`  |
| `data.data[].transport_types_arr[]`    | `supplier_transport_types`               |
| full response                          | `supplier_basic_product_list_raw_json`   |

### Implementation Notes for Codex

* This endpoint is required for selecting the target T-shirt before product detail, material upload, and quickCreate.
* Send filters as query parameters; do not send a JSON body for this GET endpoint.
* Use a valid bearer token from `/open/v1/accessToken`.
* Save the full raw response.
* Preserve money fields as strings or safe decimals.
* Do not assume the Eolink example product is a T-shirt; it is a puzzle product.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

## API 08: Get Basic Product Categorys

### Basic Info

| Field      | Value                                     |
| ---------- | ----------------------------------------- |
| API Name   | Get basic product categorys               |
| Group      | Basic product                             |
| Method     | GET                                       |
| Path       | `/open/v1/basicProduct/categorys`         |
| Full URL   | `{{host}}/open/v1/basicProduct/categorys` |
| Encoding   | utf-8                                     |
| Status     | Published                                 |
| Updated At | 2026-05-22 16:59:14                       |

### Description

获取基础选品分类，包含所有当前可用选品的分类信息。

This endpoint returns the category tree for available basic products. Offline/unavailable basic products are not included in the category list.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Request Parameters

No query/body parameters are documented.

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Request Example

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/basicProduct/categorys" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": [
    {
      "id": 385,
      "name": "组合系列",
      "en_name": "groups",
      "parent_id": 0,
      "_lft": 423,
      "_rgt": 424,
      "scopedSlots": {
        "title": "custom"
      },
      "children": []
    }
  ],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "5035fc9b-3a2d-4510-9ebb-049a5af2565b"
}
```

### Success Response Fields

| Field              | Type   | Description                          |
| ------------------ | ------ | ------------------------------------ |
| `data[]`           | array  | Basic product category list/tree     |
| `data[].id`        | int    | Category ID / 分类编号                   |
| `data[].name`      | string | Category name / 分类名称                 |
| `data[].en_name`   | string | English category name                |
| `data[].parent_id` | int    | Parent category ID                   |
| `data[].children`  | array  | Child category list                  |
| `msg`              | string | Response message                     |
| `status`           | string | Response status, expected `success`  |
| `status_code`      | int    | Business status code, expected `200` |
| `time`             | int    | Response time                        |
| `uuid`             | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Eolink note: more error codes are described on the API documentation home page.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid token returns category tree.
2. Missing token returns a clear authorization error.
3. Invalid token returns a clear authorization error.
4. Response contains category IDs and names.
5. Category tree can be traversed recursively.
6. If a T-shirt/apparel category is found, use its `id` as `category_id` for `GET /open/v1/basicProduct`.

### Fields Needed by Later Steps

The following fields may be saved for basic product filtering:

```text
supplier_category_id = data[].id
supplier_category_name = data[].name
supplier_category_en_name = data[].en_name
supplier_parent_category_id = data[].parent_id
supplier_category_children = data[].children
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/basic-product-categorys.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field   | CitiGoo Suggested Field                    |
| ---------------- | ------------------------------------------ |
| `data[].id`      | `supplier_basic_product_category_id`       |
| `data[].name`    | `supplier_basic_product_category_name`     |
| `data[].en_name` | `supplier_basic_product_category_en_name`  |
| full response    | `supplier_basic_product_category_raw_json` |

### Implementation Notes for Codex

* This endpoint is optional but useful for selecting a T-shirt category before calling `GET /open/v1/basicProduct`.
* The spelling in the path is `categorys`, not `categories`; use exactly `/open/v1/basicProduct/categorys`.
* Do not mutate supplier state.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

## API 09: Get Materials

### Basic Info

| Field      | Value                       |
| ---------- | --------------------------- |
| API Name   | Get materials               |
| Group      | Material                    |
| Method     | GET                         |
| Path       | `/open/v1/material`         |
| Full URL   | `{{host}}/open/v1/material` |
| Encoding   | utf-8                       |
| Status     | Published                   |
| Updated At | 2025-12-02 17:03:39         |

### Description

获取素材列表。素材是设计产品使用的图片数据。

This endpoint retrieves uploaded material images. It can be used to verify whether an uploaded material exists and to search existing material assets by name or current user scope.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Query Parameters

| Name         | Required | Type    | Description                                                                                        |
| ------------ | -------: | ------- | -------------------------------------------------------------------------------------------------- |
| `name`       |       no | string  | Image/material name                                                                                |
| `is_current` |       no | tinyint | Whether to restrict results to current user materials. `1=yes`, `2=no`; default is `2` if omitted. |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/material" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "name=CitiGoo dry-run test material" \
  --data-urlencode "is_current=1" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 48287,
        "code": "95RKO3",
        "name": "QQ图片20240415123857",
        "group_id": 68,
        "user_id": 68,
        "height": 942,
        "width": 960,
        "ext": "jpg",
        "size": 121117,
        "thumbnail_width": 550,
        "thumbnail_height": 539,
        "thumbnail_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/550/HHQmM5biRK1751609035081_550.jpg?x-oss-process=image/resize,m_lfit,limit_0,w_200,h_200/auto-orient,0/quality,Q_100",
        "show_image_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/550/HHQmM5biRK1751609035081_550.jpg"
      }
    ],
    "first_page_url": "/open/v1/material?page=1",
    "from": 1,
    "last_page": 331,
    "last_page_url": "/open/v1/material?page=331",
    "next_page_url": "/open/v1/material?page=2",
    "path": "/open/v1/material",
    "per_page": 1,
    "prev_page_url": null,
    "to": 1,
    "total": 331
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "6d2849d7-04cc-4745-8183-f21246c6058d"
}
```

### Success Response Fields

| Field                          | Type        | Description                                 |
| ------------------------------ | ----------- | ------------------------------------------- |
| `data.current_page`            | int         | Current page number                         |
| `data.data[]`                  | array       | Material list                               |
| `data.data[].id`               | int         | Material ID / 素材编号                          |
| `data.data[].code`             | string      | Material code / 素材编码                        |
| `data.data[].name`             | string      | Material name / 素材名称                        |
| `data.data[].height`           | int         | Material height in px                       |
| `data.data[].width`            | int         | Material width in px                        |
| `data.data[].size`             | int         | Material file size in bytes                 |
| `data.data[].ext`              | string      | Material file extension                     |
| `data.data[].thumbnail_width`  | int         | Thumbnail width in px                       |
| `data.data[].thumbnail_height` | int         | Thumbnail height in px                      |
| `data.data[].thumbnail_src`    | string      | Thumbnail URL, usually 200px                |
| `data.data[].show_image_src`   | string      | Compressed/display image URL, usually 550px |
| `data.total`                   | int         | Total material count                        |
| `data.per_page`                | int         | Page size                                   |
| `data.next_page_url`           | string/null | Next page URL                               |
| `msg`                          | string      | Response message                            |
| `status`                       | string      | Response status, expected `success`         |
| `status_code`                  | int         | Business status code, expected `200`        |
| `time`                         | int         | Response time                               |
| `uuid`                         | string      | Request UUID / trace ID                     |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid token returns material list.
2. `is_current=1` restricts results to current user materials.
3. Uploaded material can be found by `name` or latest material list.
4. Response contains `id`, `name`, `width`, `height`, `ext`, and image URLs.
5. Missing token returns a clear auth error.
6. Invalid token returns a clear auth error.
7. Pagination behavior is clear.

### Fields Needed by Later Steps

The following fields may be used to verify uploaded material or select existing material:

```text
supplier_asset_id = data.data[].id
supplier_asset_code = data.data[].code
supplier_asset_name = data.data[].name
supplier_asset_width = data.data[].width
supplier_asset_height = data.data[].height
supplier_asset_ext = data.data[].ext
supplier_asset_size_bytes = data.data[].size
supplier_asset_thumbnail_url = data.data[].thumbnail_src
supplier_asset_show_image_url = data.data[].show_image_src
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/materials.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field               | CitiGoo Suggested Field           |
| ---------------------------- | --------------------------------- |
| `data.data[].id`             | `supplier_asset_id`               |
| `data.data[].code`           | `supplier_asset_code`             |
| `data.data[].name`           | `supplier_asset_name`             |
| `data.data[].width`          | `supplier_asset_width`            |
| `data.data[].height`         | `supplier_asset_height`           |
| `data.data[].ext`            | `supplier_asset_ext`              |
| `data.data[].size`           | `supplier_asset_size_bytes`       |
| `data.data[].show_image_src` | `supplier_asset_url`              |
| full response                | `supplier_material_list_raw_json` |

### Implementation Notes for Codex

* This endpoint is optional in the dry-run if upload response already returns `data.id` and `data.image_url`.
* It is useful for verifying whether uploaded material is visible in the supplier account.
* Use `is_current=1` during dry-run if the goal is to avoid reading other users' materials.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

---

## API 10: Get Material Detail

### Basic Info

| Field            | Value                             |
| ---------------- | --------------------------------- |
| API Name         | Get material detail               |
| Group            | Material                          |
| Method           | GET                               |
| Path             | `/open/v1/material/{id}`          |
| Example Full URL | `{{host}}/open/v1/material/49334` |
| Encoding         | utf-8                             |
| Status           | Published                         |
| Updated At       | 2025-12-02 17:03:28               |

### Description

获取素材详情，包含素材列表接口之外的素材详细信息。

This endpoint retrieves detailed metadata for one uploaded material, including original/large image dimensions and image URLs.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Path Parameters

| Name | Required | Type       | Description        |
| ---- | -------: | ---------- | ------------------ |
| `id` |      yes | int/string | Material ID / 素材编号 |

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Request Example

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/material/$SUPPLIER_ASSET_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 48287,
    "code": "95RKO3",
    "name": "QQ图片20240415123857",
    "group_id": 68,
    "user_id": 68,
    "height": 942,
    "width": 960,
    "ext": "jpg",
    "size": 121117,
    "thumbnail_width": 550,
    "thumbnail_height": 539,
    "big_width": 1000,
    "big_height": 981,
    "thumbnail_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/550/HHQmM5biRK1751609035081_550.jpg?x-oss-process=image/resize,m_lfit,limit_0,w_200,h_200/auto-orient,0/quality,Q_100",
    "show_image_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/550/HHQmM5biRK1751609035081_550.jpg",
    "big_image_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/1200/HHQmM5biRK1751609035081_1200.jpg?x-oss-process=image/resize,m_lfit,limit_0,w_1000,h_1000/auto-orient,0/quality,Q_100"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "fc219393-8580-4bac-b0ba-fcde52c6b636"
}
```

### Success Response Fields

| Field                   | Type   | Description                                 |
| ----------------------- | ------ | ------------------------------------------- |
| `data.id`               | int    | Material ID / 素材编号                          |
| `data.code`             | string | Material code / 素材编码                        |
| `data.name`             | string | Material name / 素材名称                        |
| `data.height`           | int    | Material height in px                       |
| `data.width`            | int    | Material width in px                        |
| `data.size`             | int    | Material file size in bytes                 |
| `data.ext`              | string | Material file extension                     |
| `data.thumbnail_width`  | int    | Thumbnail width in px                       |
| `data.thumbnail_height` | int    | Thumbnail height in px                      |
| `data.thumbnail_src`    | string | Thumbnail URL, usually 200px                |
| `data.show_image_src`   | string | Compressed/display image URL, usually 550px |
| `data.big_width`        | int    | Design image width in px                    |
| `data.big_height`       | int    | Design image height in px                   |
| `data.big_image_src`    | string | Design image URL, usually 1000px            |
| `msg`                   | string | Response message                            |
| `status`                | string | Response status, expected `success`         |
| `status_code`           | int    | Business status code, expected `200`        |
| `time`                  | int    | Response time                               |
| `uuid`                  | string | Request UUID / trace ID                     |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing `Authorization`.
2. Invalid token.
3. Nonexistent material ID.
4. Material belonging to another user.
5. Deleted material if deletion exists.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Uploaded material ID can be queried successfully.
2. Response contains `data.id`.
3. Response contains `data.width` and `data.height`.
4. Response contains `data.big_width` and `data.big_height`.
5. Response contains `data.show_image_src` or `data.big_image_src`.
6. Material image dimensions are compatible with selected print area.
7. Invalid material ID returns a clear error.
8. Missing token returns a clear auth error.

### Fields Needed by Later Steps

The following fields should be saved for product generation and debugging:

```text
supplier_asset_id = data.id
supplier_asset_code = data.code
supplier_asset_name = data.name
supplier_asset_width = data.width
supplier_asset_height = data.height
supplier_asset_big_width = data.big_width
supplier_asset_big_height = data.big_height
supplier_asset_ext = data.ext
supplier_asset_size_bytes = data.size
supplier_asset_show_image_url = data.show_image_src
supplier_asset_big_image_url = data.big_image_src
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/material-detail.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field        | CitiGoo Suggested Field             |
| --------------------- | ----------------------------------- |
| `data.id`             | `supplier_asset_id`                 |
| `data.code`           | `supplier_asset_code`               |
| `data.name`           | `supplier_asset_name`               |
| `data.width`          | `supplier_asset_width`              |
| `data.height`         | `supplier_asset_height`             |
| `data.big_width`      | `supplier_asset_big_width`          |
| `data.big_height`     | `supplier_asset_big_height`         |
| `data.ext`            | `supplier_asset_ext`                |
| `data.size`           | `supplier_asset_size_bytes`         |
| `data.show_image_src` | `supplier_asset_url`                |
| `data.big_image_src`  | `supplier_asset_big_image_url`      |
| full response         | `supplier_material_detail_raw_json` |

### Implementation Notes for Codex

* Use this endpoint after `Upload Material` to verify the uploaded material is queryable.
* Prefer `data.id` from `Upload Material` as the path parameter.
* Do not mutate supplier state.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.
## API 11: Get Shops

### Basic Info

| Field      | Value                    |
| ---------- | ------------------------ |
| API Name   | Get shops                |
| Group      | Shop                     |
| Method     | GET                      |
| Path       | `/open/v1/store`         |
| Full URL   | `{{host}}/open/v1/store` |
| Encoding   | utf-8                    |
| Status     | Published                |
| Updated At | 2025-12-02 17:06:44      |

### Description

获取店铺列表。供应商侧店铺之间数据隔离。

This endpoint retrieves supplier-side shops/stores. Shops are isolated from each other.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Query Parameters

| Name       | Required | Type   | Description          |
| ---------- | -------: | ------ | -------------------- |
| `name`     |       no | string | Shop name / 店铺名称     |
| `platform` |       no | int    | Platform type / 平台类型 |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/store" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "name=CitiGoo" \
  --data-urlencode "platform=99" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 2552,
        "code": "SOQY7D",
        "platform": 19,
        "name": "xm-shein-test-2",
        "auth_status": 2,
        "status": 1,
        "sort": 2,
        "is_auto_sync_order": 1,
        "is_auto_sync_shipment": 1,
        "created_at": "2025-07-15 21:31:36",
        "platform_text": "Shein"
      },
      {
        "id": 2551,
        "code": "HZHYOR",
        "platform": 19,
        "name": "xm-shein-test",
        "auth_status": 2,
        "status": 1,
        "sort": 0,
        "is_auto_sync_order": 1,
        "is_auto_sync_shipment": 1,
        "created_at": "2025-07-15 21:30:53",
        "platform_text": "Shein"
      }
    ],
    "first_page_url": "http://open.s2bdiy.local/open/v1/store?page=1",
    "from": 1,
    "last_page": 1,
    "last_page_url": "http://open.s2bdiy.local/open/v1/store?page=1",
    "links": [],
    "next_page_url": null,
    "path": "http://open.s2bdiy.local/open/v1/store",
    "per_page": 20,
    "prev_page_url": null,
    "to": 2,
    "total": 2
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "8fd144aa-b264-42f8-a5c3-0ee2587a7a70"
}
```

### Success Response Fields

| Field                               | Type   | Description                                          |
| ----------------------------------- | ------ | ---------------------------------------------------- |
| `data.current_page`                 | int    | Current page                                         |
| `data.data[]`                       | array  | Shop list                                            |
| `data.data[].id`                    | int    | Shop ID / 编号                                         |
| `data.data[].code`                  | string | Shop code / 编码                                       |
| `data.data[].platform`              | int    | Platform type                                        |
| `data.data[].platform_text`         | string | Platform type name                                   |
| `data.data[].name`                  | string | Shop name                                            |
| `data.data[].auth_status`           | int    | Authorization status. `1=enabled`, `2=disabled`      |
| `data.data[].status`                | int    | Shop status. `1=enabled`, `2=disabled`               |
| `data.data[].sort`                  | int    | Sort order                                           |
| `data.data[].is_auto_sync_order`    | int    | Auto order sync switch. `1=enabled`, `2=disabled`    |
| `data.data[].is_auto_sync_shipment` | int    | Auto shipment sync switch. `1=enabled`, `2=disabled` |
| `data.data[].created_at`            | string | Creation time                                        |
| `data.total`                        | int    | Total shop count                                     |
| `data.per_page`                     | int    | Page size                                            |
| `msg`                               | string | Response message                                     |
| `status`                            | string | Response status, expected `success`                  |
| `status_code`                       | int    | Business status code, expected `200`                 |
| `time`                              | int    | Response time                                        |
| `uuid`                              | string | Request UUID / trace ID                              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing `Authorization`.
2. Invalid token.
3. Invalid `platform`.
4. No matching shop name.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Creates supplier shop?       | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid token returns shop list.
2. Response contains shop `id`, `code`, `name`, `platform`, and `status`.
3. At least one active shop exists if order creation requires shop/store binding.
4. Missing token returns a clear authorization error.
5. Invalid token returns a clear authorization error.
6. Filtering by `name` works if needed.
7. Filtering by `platform` works if needed.

### Fields Needed by Later Steps

The following fields may be needed for order creation or platform channel mapping:

```text
supplier_shop_id = data.data[].id
supplier_shop_code = data.data[].code
supplier_shop_name = data.data[].name
supplier_shop_platform = data.data[].platform
supplier_shop_platform_text = data.data[].platform_text
supplier_shop_status = data.data[].status
supplier_shop_auth_status = data.data[].auth_status
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/shops.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field              | CitiGoo Suggested Field       |
| --------------------------- | ----------------------------- |
| `data.data[].id`            | `supplier_shop_id`            |
| `data.data[].code`          | `supplier_shop_code`          |
| `data.data[].name`          | `supplier_shop_name`          |
| `data.data[].platform`      | `supplier_platform_id`        |
| `data.data[].platform_text` | `supplier_platform_name`      |
| `data.data[].status`        | `supplier_shop_status`        |
| `data.data[].auth_status`   | `supplier_shop_auth_status`   |
| full response               | `supplier_shop_list_raw_json` |

### Implementation Notes for Codex

* This endpoint is safe and can be included in no-payment dry-run.
* It may help determine which supplier shop/store should be used for order creation.
* Do not assume CitiGoo `store_id` maps directly to S2BDIY `store.id`; mapping must be explicitly stored.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 12: Create Shop

### Basic Info

| Field      | Value                    |
| ---------- | ------------------------ |
| API Name   | Create shop              |
| Group      | Shop                     |
| Method     | POST                     |
| Path       | `/open/v1/store`         |
| Full URL   | `{{host}}/open/v1/store` |
| Encoding   | utf-8                    |
| Status     | Published                |
| Updated At | 2025-12-02 17:06:32      |

### Description

创建供应商侧店铺。

This endpoint creates a supplier-side shop/store.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Content Type

```http
Content-Type: application/json
```

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Request Body Parameters

| Name                    | Required | Type   | Description                                                     |
| ----------------------- | -------: | ------ | --------------------------------------------------------------- |
| `name`                  |      yes | string | Shop name / 店铺名称                                                |
| `platform`              |      yes | int    | Platform type / 平台类型                                            |
| `sort`                  |       no | int    | Sort order                                                      |
| `language_type`         |       no | int    | Language type. `0=Chinese`, `1=English`, `2=Japanese`           |
| `is_auto_sync_order`    |       no | int    | Auto order sync switch. `1=enabled`, `2=disabled`               |
| `is_auto_sync_shipment` |       no | int    | Auto shipment sync switch. `1=enabled`, `2=disabled`            |
| `status`                |       no | int    | Shop status. `1=enabled`, `2=disabled`                          |
| `country`               |       no | string | Country ISO code. Required for Amazon platform, e.g. `US`       |
| `domain`                |       no | string | Site domain. Required for independent site                      |
| `shiplater_time`        |       no | int    | Temu delayed shipping setting. `1=24h`, `2=48h`, `3=72h`        |
| `order_relation_mode`   |       no | int    | Temu order-product relation mode. `1=product number`, `2=skuID` |

### Request Example From Eolink

```json
{
  "name": "xxxx",
  "platform": 2
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/store" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CitiGoo dry-run shop",
    "platform": 99,
    "language_type": 1,
    "status": 1,
    "is_auto_sync_order": 2,
    "is_auto_sync_shipment": 2
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 2552
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "d26663db-4001-4b5a-ace2-c3eb3ba3002b"
}
```

### Success Response Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `data.id`     | int    | Created shop ID / 编号                 |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing `Authorization`.
2. Invalid token.
3. Missing `name`.
4. Missing `platform`.
5. Invalid `platform`.
6. Duplicate shop name.
7. Missing `country` when platform is Amazon.
8. Missing `domain` when platform is independent site.
9. Invalid Temu-specific fields.

### Dry-run Safety

| Check                                 | Value                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Creates supplier product?             | NO                                                                           |
| Creates supplier order?               | NO                                                                           |
| Creates supplier shop?                | YES                                                                          |
| Charges money?                        | LIKELY NO                                                                    |
| Safe for no-payment supplier dry-run? | NO                                                                           |
| Can be repeated?                      | UNKNOWN; duplicate shop behavior must be verified manually only if approved. |

### Validation Points

This endpoint should not run in the default no-payment dry-run.

If account/shop provisioning is explicitly approved, verify:

1. Valid token can create a shop.
2. Response contains `data.id`.
3. Created shop appears in `GET /open/v1/store`.
4. Duplicate shop name behavior is clear.
5. Invalid platform returns a clear error.
6. Required conditional fields are enforced, such as Amazon `country` or independent site `domain`.

### Fields Needed by Later Steps

If shop creation is approved, save:

```text
supplier_shop_id = data.id
supplier_shop_name = request.name
supplier_shop_platform = request.platform
```

### Local Raw Response Save Path

If manually tested:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/create-shop.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field     | CitiGoo Suggested Field         |
| ------------------ | ------------------------------- |
| `data.id`          | `supplier_shop_id`              |
| request `name`     | `supplier_shop_name`            |
| request `platform` | `supplier_platform_id`          |
| full response      | `supplier_create_shop_raw_json` |

### Implementation Notes for Codex

* Do not call this endpoint in the default no-payment dry-run.
* This endpoint mutates supplier account state by creating a shop.
* Only call when explicitly approved by a human operator.
* Prefer using an existing shop from `GET /open/v1/store` for initial supplier dry-run.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

## API 13: Calculate Logistics Costs

### Basic Info

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| API Name   | Calculate logistics costs               |
| Group      | Logistics                               |
| Method     | GET                                     |
| Path       | `/open/v1/logisticsCalculation`         |
| Full URL   | `{{host}}/open/v1/logisticsCalculation` |
| Encoding   | utf-8                                   |
| Status     | Published                               |
| Updated At | 2026-04-08 15:51:19                     |

### Description

运费试算。对指定基础选品进行运费试算，以获取预估物流成本信息。

This endpoint estimates logistics cost for a basic product using destination address and package information.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Query Parameters

| Name               | Required | Type       | Description                                             |
| ------------------ | -------: | ---------- | ------------------------------------------------------- |
| `basic_product_id` |      yes | int        | Basic product ID / 选品 ID                                |
| `platform`         |       no | int        | Platform channel. See overview / platform channel docs. |
| `num`              |       no | int        | Quantity. Default: `1`                                  |
| `country`          |      yes | string     | Country code, e.g. `CN`, `US`                           |
| `province`         |       no | string     | Province/state                                          |
| `postcode`         |       no | string     | Postal code                                             |
| `weight`           |      yes | int        | Weight in grams                                         |
| `length`           |       no | int/string | Package length in cm                                    |
| `width`            |       no | int/string | Package width in cm                                     |
| `height`           |       no | int/string | Package height in cm                                    |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/logisticsCalculation" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "basic_product_id=$SUPPLIER_BASIC_PRODUCT_ID" \
  --data-urlencode "platform=99" \
  --data-urlencode "num=1" \
  --data-urlencode "country=US" \
  --data-urlencode "province=CA" \
  --data-urlencode "postcode=90001" \
  --data-urlencode "weight=730" \
  --data-urlencode "length=32.00" \
  --data-urlencode "width=24.00" \
  --data-urlencode "height=9.00" | jq .
```

### Success Response Example

```json
{
  "data": [
    {
      "id": 13,
      "name": "递四方物流普货-100",
      "logistics_platform_id": 365,
      "en_name": "4px-QX",
      "full_en_name": "4PX Logistics General",
      "day_from": 1,
      "day_to": 3,
      "amount": "0.50",
      "min_amount": "8.60",
      "max_amount": "8.60"
    }
  ],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "a7fda210-569b-4752-a9e6-7fbb5c5a302e"
}
```

### Success Response Fields

| Field                          | Type           | Description                         |
| ------------------------------ | -------------- | ----------------------------------- |
| `data[].id`                    | int            | Logistics rule ID / 规则编号            |
| `data[].name`                  | string         | Logistics channel name              |
| `data[].logistics_platform_id` | int            | Logistics platform/channel ID       |
| `data[].en_name`               | string         | Logistics channel English name      |
| `data[].full_en_name`          | string         | Full logistics channel English name |
| `data[].day_from`              | int            | Minimum estimated delivery days     |
| `data[].day_to`                | int            | Maximum estimated delivery days     |
| `data[].amount`                | decimal string | Estimated logistics cost            |
| `data[].min_amount`            | decimal string | Minimum estimated logistics cost    |
| `data[].max_amount`            | decimal string | Maximum estimated logistics cost    |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Valid token returns logistics options.
2. Valid `basic_product_id` returns at least one option.
3. Response contains `logistics_platform_id`.
4. Response contains estimated cost fields: `amount`, `min_amount`, `max_amount`.
5. Invalid `basic_product_id` returns a clear error.
6. Missing `country` returns a clear validation error.
7. Missing `weight` returns a clear validation error.
8. Selected logistics option can be used later in order creation if required.

### Fields Needed by Later Steps

```text
supplier_logistics_rule_id = data[].id
supplier_logistics_platform_id = data[].logistics_platform_id
supplier_logistics_name = data[].name
estimated_shipping_cost = data[].amount
estimated_shipping_min_cost = data[].min_amount
estimated_shipping_max_cost = data[].max_amount
estimated_day_from = data[].day_from
estimated_day_to = data[].day_to
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/logistics-calculation.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                 | CitiGoo Suggested Field                   |
| ------------------------------ | ----------------------------------------- |
| `data[].id`                    | `supplier_logistics_rule_id`              |
| `data[].logistics_platform_id` | `supplier_logistics_platform_id`          |
| `data[].name`                  | `supplier_logistics_name`                 |
| `data[].amount`                | `estimated_shipping_cost`                 |
| `data[].min_amount`            | `estimated_shipping_min_cost`             |
| `data[].max_amount`            | `estimated_shipping_max_cost`             |
| full response                  | `supplier_logistics_calculation_raw_json` |

### Implementation Notes for Codex

* This endpoint estimates shipping cost using basic product/package data.
* It is different from `/open/v1/calculateProducts`, which estimates shipping for one or more generated products with `product_id + stock_sku_item_id`.
* Use this before product generation if only basic product data is available.
* Use `/open/v1/calculateProducts` after generated product ID and stock SKU item ID are available.
* Do not treat estimated logistics amount as final payable amount.
* Final payable amount must come from order detail/pricing after order creation.
* Use safe decimal handling for money.
* Mask `Authorization` token in logs.
* This endpoint is allowed in no-payment dry-run.

---

## API 14: Create Product

### Basic Info

| Field      | Value                                  |
| ---------- | -------------------------------------- |
| API Name   | Create Product                         |
| Group      | Product                                |
| Method     | POST                                   |
| Path       | `/open/v1/product/quickCreate`         |
| Full URL   | `{{host}}/open/v1/product/quickCreate` |
| Encoding   | utf-8                                  |
| Status     | Published                              |
| Updated At | 2026-05-22 18:15:57                    |

### Description

创建产品。产品是“设计过后的选品”。素材 ID 可以通过素材上传接口获取，也可以通过素材列表获取。

This endpoint creates a designed supplier product from a basic product, selected color/size, print view, material image, and design mode.

### Design Types

| Value | Chinese Name | Meaning From Eolink           | Practical Interpretation                                                   |
| ----: | ------------ | ----------------------------- | -------------------------------------------------------------------------- |
|   `1` | 适应           | 素材图保持原比例，缩放到完全覆盖打印区域（无空白）     | Cover print area while preserving aspect ratio; may crop                   |
|   `2` | 拉伸           | 素材图保持原比例，缩放到最大能完全放在打印区域中（有空白） | Fit inside print area while preserving aspect ratio; may leave blank space |
|   `3` | 填充           | 素材图宽高与打印区域宽高保持一致（无空白）         | Stretch/fill to exact print area size; may distort                         |

### Auth

| Field         | Value                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Auth Required | LIKELY YES                                                                                                            |
| Auth Header   | `Authorization: Bearer <token>`                                                                                       |
| Token Source  | `/open/v1/accessToken`                                                                                                |
| Notes         | Header was not shown in pasted Eolink content, but Product business APIs likely require token. Verify during testing. |

### Content Type

```http
Content-Type: application/json
```

### Request Body Parameters

| Name                                           | Required | Type   | Description                                       |
| ---------------------------------------------- | -------: | ------ | ------------------------------------------------- |
| `size_id`                                      |      yes | int    | Size ID selected from basic product detail        |
| `color_id`                                     |      yes | int    | Color ID selected from basic product detail       |
| `product_design`                               |      yes | object | Designed product definition                       |
| `product_design.basic_product_id`              |      yes | int    | Basic product ID / 选品 ID                          |
| `product_design.name`                          |      yes | string | Product name                                      |
| `product_design.views`                         |      yes | array  | Print views/design surfaces                       |
| `product_design.views[].view_id`               |      yes | int    | Print view ID                                     |
| `product_design.views[].objects`               |      yes | array  | Design objects                                    |
| `product_design.views[].objects[].type`        |      yes | string | Object type. Currently only `image` is supported. |
| `product_design.views[].objects[].material_id` |      yes | int    | Uploaded material ID                              |
| `product_design.views[].objects[].design_type` |      yes | int    | Design type: `1`, `2`, or `3`                     |

### Request Example From Eolink

```json
{
  "size_id": 20,
  "color_id": 6,
  "product_design": {
    "basic_product_id": 1672,
    "name": "产品名称",
    "views": [
      {
        "view_id": 1,
        "objects": [
          {
            "type": "image",
            "material_id": 52336,
            "design_type": 1
          }
        ]
      }
    ]
  }
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/product/quickCreate" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size_id": '"$SELECTED_SIZE_ID"',
    "color_id": '"$SELECTED_COLOR_ID"',
    "product_design": {
      "basic_product_id": '"$SUPPLIER_BASIC_PRODUCT_ID"',
      "name": "CitiGoo dry-run T-shirt",
      "views": [
        {
          "view_id": '"$SELECTED_VIEW_ID"',
          "objects": [
            {
              "type": "image",
              "material_id": '"$SUPPLIER_ASSET_ID"',
              "design_type": 1
            }
          ]
        }
      ]
    }
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "product_id": 170083,
    "product_name": "产品名称",
    "product_code": "4ZQJ95"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "31ec7ba4-0a88-42c8-b321-db83ac262503"
}
```

### Success Response Fields

| Field               | Type   | Description                          |
| ------------------- | ------ | ------------------------------------ |
| `data.product_id`   | int    | Designed supplier product ID         |
| `data.product_name` | string | Designed product name                |
| `data.product_code` | string | Designed product code                |
| `msg`               | string | Response message                     |
| `status`            | string | Response status, expected `success`  |
| `status_code`       | int    | Business status code, expected `200` |
| `time`              | int    | Response time                        |
| `uuid`              | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid `basic_product_id`.
4. Invalid `size_id`.
5. Invalid `color_id`.
6. Invalid `view_id`.
7. Invalid `material_id`.
8. Unsupported object `type`.
9. Invalid `design_type`.
10. Material image incompatible with product/design area.

### Dry-run Safety

| Check                        | Value                                              |
| ---------------------------- | -------------------------------------------------- |
| Creates supplier product?    | YES                                                |
| Creates supplier order?      | NO                                                 |
| Charges money?               | LIKELY NO, but must verify with supplier           |
| Safe for no-payment dry-run? | YES, if supplier confirms product creation is free |
| Can be repeated?             | YES, but may create duplicate designed products    |

### Validation Points

During supplier dry-run, verify:

1. Valid uploaded material ID can be used.
2. Valid basic product ID can be used.
3. Valid color ID can be used.
4. Valid size ID can be used.
5. Valid Front/A面 view ID can be used.
6. `design_type=1` works.
7. Optional second test with `design_type=3` works if safe.
8. Response contains `data.product_id`.
9. Response contains `data.product_code`.
10. Product can be queried with Get Product Detail.
11. Repeated request behavior is clear: creates duplicate product or returns same product.
12. Generation is synchronous or async behavior is clear.

### Fields Needed by Later Steps

```text
supplier_product_id = data.product_id
supplier_product_name = data.product_name
supplier_product_code = data.product_code
supplier_basic_product_id = request.product_design.basic_product_id
supplier_color_id = request.color_id
supplier_size_id = request.size_id
supplier_view_id = request.product_design.views[].view_id
supplier_asset_id = request.product_design.views[].objects[].material_id
supplier_design_type = request.product_design.views[].objects[].design_type
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/create-product.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                            | CitiGoo Suggested Field            |
| ----------------------------------------- | ---------------------------------- |
| `data.product_id`                         | `supplier_product_id`              |
| `data.product_name`                       | `supplier_product_name`            |
| `data.product_code`                       | `supplier_product_code`            |
| request `product_design.basic_product_id` | `supplier_basic_product_id`        |
| request `color_id`                        | `supplier_color_id`                |
| request `size_id`                         | `supplier_size_id`                 |
| request `view_id`                         | `supplier_view_id`                 |
| request `material_id`                     | `supplier_asset_id`                |
| request `design_type`                     | `supplier_design_type`             |
| full response                             | `supplier_create_product_raw_json` |

### Implementation Notes for Codex

* This is a core endpoint for the single-store supplier dry-run.
* Run only after successful token, basic product detail, and material upload.
* For first dry-run, use one product, one color, one size, one print view, one material object.
* Prefer `design_type=1` for the first test.
* Do not create many products in a loop.
* Save raw request and response for debugging.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* Confirm whether creating a designed product is free before real execution.

---

## API 15: Get Batch Designs

### Basic Info

| Field      | Value                          |
| ---------- | ------------------------------ |
| API Name   | Get batch designs              |
| Group      | Product                        |
| Method     | GET                            |
| Path       | `/open/v1/batchDesign`         |
| Full URL   | `{{host}}/open/v1/batchDesign` |
| Encoding   | utf-8                          |
| Status     | Published                      |
| Updated At | 2025-12-02 17:05:52            |

### Description

获取 S2B 平台批量设计后的状态和数量信息，包括成功数量、失败数量、等待数量和处理状态。

This endpoint lists batch design jobs and their processing status.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Query Parameters

| Name     | Required | Type | Description                                                                 |
| -------- | -------: | ---- | --------------------------------------------------------------------------- |
| `status` |       no | int  | Batch design status: `1=completed`, `2=pending`, `3=processing`, `4=failed` |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/batchDesign" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "status=1" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1443,
        "uuid": "ed3ccafb-7f47-493f-98eb-01e3c69249fd",
        "failed_num": 0,
        "success_num": 1,
        "wait_num": 0,
        "num": 1,
        "status": 1,
        "status_text": "已完成"
      }
    ],
    "first_page_url": "http://open.s2bdiy.local/open/v1/batchDesign?page=1",
    "from": 1,
    "last_page": 14,
    "last_page_url": "http://open.s2bdiy.local/open/v1/batchDesign?page=14",
    "links": [],
    "next_page_url": "http://open.s2bdiy.local/open/v1/batchDesign?page=2",
    "path": "http://open.s2bdiy.local/open/v1/batchDesign",
    "per_page": 1,
    "prev_page_url": null,
    "to": 1,
    "total": 14
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "4e6030d8-2278-49a6-acc8-7380ca710b4a"
}
```

### Success Response Fields

| Field                     | Type   | Description                                                    |
| ------------------------- | ------ | -------------------------------------------------------------- |
| `data.current_page`       | int    | Current page                                                   |
| `data.data[]`             | array  | Batch design job list                                          |
| `data.data[].id`          | int    | Batch design ID                                                |
| `data.data[].uuid`        | string | Batch design UUID                                              |
| `data.data[].failed_num`  | int    | Failed item count                                              |
| `data.data[].success_num` | int    | Successful item count                                          |
| `data.data[].wait_num`    | int    | Waiting item count                                             |
| `data.data[].num`         | int    | Total item count                                               |
| `data.data[].status`      | int    | Status: `1=completed`, `2=pending`, `3=processing`, `4=failed` |
| `data.data[].status_text` | string | Status text                                                    |
| `data.total`              | int    | Total batch design job count                                   |
| `data.per_page`           | int    | Page size                                                      |
| `msg`                     | string | Response message                                               |
| `status`                  | string | Response status, expected `success`                            |
| `status_code`             | int    | Business status code, expected `200`                           |
| `time`                    | int    | Response time                                                  |
| `uuid`                    | string | Request UUID / trace ID                                        |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid status value.
4. Empty batch design list.

### Dry-run Safety

| Check                                | Value |
| ------------------------------------ | ----- |
| Creates supplier product?            | NO    |
| Creates supplier order?              | NO    |
| Charges money?                       | NO    |
| Safe for no-payment dry-run?         | YES   |
| Required for single-product dry-run? | NO    |
| Can be repeated?                     | YES   |

### Validation Points

During supplier testing, verify:

1. Valid token returns batch design list.
2. Status filter works.
3. Failed jobs expose `failed_num`.
4. Completed jobs expose `success_num`.
5. Missing or invalid token returns clear auth error.

### Fields Needed by Later Steps

Usually not needed for single-product dry-run.

If batch design flow is later used, save:

```text
supplier_batch_design_id = data.data[].id
supplier_batch_design_uuid = data.data[].uuid
supplier_batch_design_status = data.data[].status
supplier_batch_design_status_text = data.data[].status_text
supplier_batch_design_success_num = data.data[].success_num
supplier_batch_design_failed_num = data.data[].failed_num
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/batch-designs.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field            | CitiGoo Suggested Field             |
| ------------------------- | ----------------------------------- |
| `data.data[].id`          | `supplier_batch_design_id`          |
| `data.data[].uuid`        | `supplier_batch_design_uuid`        |
| `data.data[].status`      | `supplier_batch_design_status`      |
| `data.data[].status_text` | `supplier_batch_design_status_text` |
| full response             | `supplier_batch_design_raw_json`    |

### Implementation Notes for Codex

* This endpoint is not required for the first single-store, single-product dry-run.
* It is useful later for batch product generation monitoring.
* Do not confuse batch design jobs with `quickCreate` single product creation.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

## API 16: Update Order Address and Logistics Channel

### Basic Info

| Field            | Value                                                 |
| ---------------- | ----------------------------------------------------- |
| API Name         | Update order address and logistics channel            |
| Group            | Order                                                 |
| Method           | POST                                                  |
| Path             | `/open/v1/order/updateOrderLogistics/{order_id}`      |
| Example Full URL | `{{host}}/open/v1/order/updateOrderLogistics/7037203` |
| Encoding         | utf-8                                                 |
| Status           | Published                                             |
| Updated At       | 2025-12-11 15:20:35                                   |

### Description

修改订单收货地址或更换物流渠道。

This endpoint updates an order's shipping address and/or logistics channel. It is intended for orders that cannot be paid because of logistics channel issues, or orders that require address/logistics adjustment before payment.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Content Type

```http
Content-Type: application/json
```

### Path Parameters

| Name       | Required | Type       | Description       |
| ---------- | -------: | ---------- | ----------------- |
| `order_id` |      yes | int/string | Supplier order ID |

### Request Body Parameters

| Name                   | Required | Type       | Description               |
| ---------------------- | -------: | ---------- | ------------------------- |
| `logistics_id`         |      yes | int        | Logistics channel ID      |
| `address`              |      yes | object     | Shipping address object   |
| `address.firstname`    |      yes | string     | First name                |
| `address.lastname`     |      yes | string     | Last name                 |
| `address.country`      |      yes | string     | Country code, e.g. `US`   |
| `address.province`     |      yes | string     | Province/state            |
| `address.city`         |      yes | string     | City                      |
| `address.postcode`     |      yes | string/int | Postal code               |
| `address.telephone`    |       no | string     | Telephone                 |
| `address.mobile_phone` |       no | string     | Mobile phone              |
| `address.address`      |      yes | string     | Street address            |
| `address.ioss`         |       no | string/int | IOSS number if applicable |

### Request Example From Eolink

```json
{
  "logistics_id": 73,
  "address": {
    "firstname": "first name",
    "lastname": "last name---",
    "country": "US",
    "province": "huashengdun",
    "city": "ces",
    "postcode": 350311,
    "telephone": "+1563254",
    "mobile_phone": "+15453245",
    "address": "jshhgnh jkswjhgh ljshjgj",
    "ioss": 541
  }
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/order/updateOrderLogistics/$SUPPLIER_ORDER_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logistics_id": '"$SUPPLIER_LOGISTICS_PLATFORM_ID"',
    "address": {
      "firstname": "CitiGoo",
      "lastname": "SmokeTest",
      "country": "US",
      "province": "CA",
      "city": "Los Angeles",
      "postcode": "90001",
      "telephone": "+10000000000",
      "mobile_phone": "+10000000000",
      "address": "123 Test Street",
      "ioss": ""
    }
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 929,
    "third_order_id": "test002"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "uuid": "6423fc55-30c9-47ff-be9e-74eb28f42a8e"
}
```

### Success Response Fields

| Field                 | Type   | Description                                   |
| --------------------- | ------ | --------------------------------------------- |
| `data.id`             | int    | Supplier order ID                             |
| `data.third_order_id` | string | Submitted third-party / external order number |
| `msg`                 | string | Response message                              |
| `status`              | string | Response status, expected `success`           |
| `status_code`         | int    | Business status code, expected `200`          |
| `uuid`                | string | Request UUID / trace ID                       |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid `order_id`.
4. Invalid `logistics_id`.
5. Invalid country/province/postcode.
6. Missing required address fields.
7. Updating an already paid / in-production / shipped order.
8. Logistics channel unavailable for the destination.

### Dry-run Safety

| Check                                | Value                                            |
| ------------------------------------ | ------------------------------------------------ |
| Creates supplier product?            | NO                                               |
| Creates supplier order?              | NO                                               |
| Mutates existing order?              | YES                                              |
| Charges money?                       | LIKELY NO, but may affect payable logistics cost |
| Safe for default no-payment dry-run? | NO                                               |
| Can be repeated?                     | UNKNOWN                                          |

### Validation Points

This endpoint should not run in the default first dry-run.

If manually tested on an unpaid test order, verify:

1. Order address can be updated before payment.
2. Logistics channel can be changed before payment.
3. Updated order detail reflects new address/logistics.
4. New order pricing reflects updated logistics if applicable.
5. Invalid logistics channel returns clear error.
6. Invalid address returns clear validation error.
7. Paid or shipped order cannot be changed, or behavior is clearly documented.

### Fields Needed by Later Steps

If used, save:

```text
updated_supplier_order_id = data.id
updated_third_order_id = data.third_order_id
selected_logistics_id = request.logistics_id
updated_shipping_address = request.address
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/update-order-logistics.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field         | CitiGoo Suggested Field                    |
| ---------------------- | ------------------------------------------ |
| `data.id`              | `supplier_order_id`                        |
| `data.third_order_id`  | `external_order_id`                        |
| request `logistics_id` | `supplier_logistics_id`                    |
| request `address`      | `supplier_shipping_address_json`           |
| full response          | `supplier_update_order_logistics_raw_json` |

### Implementation Notes for Codex

* Do not call this endpoint in the first no-payment dry-run.
* This endpoint mutates supplier order state.
* Only call after an unpaid test order exists and a human approves address/logistics update testing.
* Use `Get Available Logistics for the Order` first if the current logistics channel is invalid.
* Mask `Authorization` token in logs.
* Mask real customer address and phone data; use synthetic test address only.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 17: Get Product Detail

### Basic Info

| Field            | Value                            |
| ---------------- | -------------------------------- |
| API Name         | Get product detail               |
| Group            | Product                          |
| Method           | GET                              |
| Path             | `/open/v1/product/{id}`          |
| Example Full URL | `{{host}}/open/v1/product/61547` |
| Encoding         | utf-8                            |
| Status           | Published                        |
| Updated At       | 2026-01-15 14:01:12              |

### Description

获取设计产品详情。产品是基于基础选品设计后的商品。

This endpoint retrieves detail for a designed supplier product, including basic product ID, product code, design type, status, colors, sizes, mockup/show images, quality warning levels, and product variants.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Path Parameters

| Name | Required | Type       | Description                  |
| ---- | -------: | ---------- | ---------------------------- |
| `id` |      yes | int/string | Supplier designed product ID |

### Request Headers

| Header          | Required | Description      |
| --------------- | -------: | ---------------- |
| `Authorization` |      yes | `Bearer <token>` |

### Request Example

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/product/$SUPPLIER_PRODUCT_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 11907,
    "code": "U65JPA",
    "basic_product_id": 105,
    "name": "キャプテン・アメリカ A (2)",
    "en_name": "キャプテン・アメリカ A (2)",
    "design_type": 1,
    "username": "QAQxmm",
    "status": 1,
    "status_text": "上架",
    "colors": [
      {
        "id": 6,
        "name": "白色",
        "en_name": "White",
        "tone": "#FFFFFF"
      }
    ],
    "sizes": [
      {
        "id": 59,
        "name": "18x18 Inch",
        "en_name": "18x18 Inch"
      }
    ],
    "tip_levels": [
      {
        "view_id": 1,
        "background": "",
        "tip_level": 3
      }
    ],
    "show_images": [
      {
        "color_id": 6,
        "color_name": "白色",
        "tone": "#FFFFFF",
        "images": [
          {
            "src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/showImages/U65JPA_6_1.jpg",
            "is_user_show_image": 2
          }
        ]
      }
    ],
    "variants": [
      {
        "sku": "U65JPA-UFLWOU",
        "color_id": 6,
        "size_id": 59,
        "color_name": "白色",
        "size_name": "18x18 Inch",
        "show_images": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/showImages/U65JPA_6_1.jpg",
        "status": 1,
        "status_text": "上架"
      }
    ]
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "56a432c5-0f32-411d-89c4-c35fe570a091"
}
```

### Success Response Fields

| Field                             | Type   | Description                                                    |
| --------------------------------- | ------ | -------------------------------------------------------------- |
| `data.id`                         | int    | Designed product ID                                            |
| `data.basic_product_id`           | int    | Basic product ID                                               |
| `data.code`                       | string | Product code                                                   |
| `data.name`                       | string | Product name                                                   |
| `data.en_name`                    | string | English product name                                           |
| `data.design_type`                | int    | Design type                                                    |
| `data.design_type_text`           | string | Design type text, if present                                   |
| `data.username`                   | string | Username                                                       |
| `data.status`                     | int    | Product status                                                 |
| `data.status_text`                | string | Product listing/status text, e.g. `上架`                         |
| `data.colors[]`                   | array  | Product color list                                             |
| `data.colors[].id`                | int    | Color ID                                                       |
| `data.colors[].name`              | string | Color name                                                     |
| `data.colors[].en_name`           | string | English color name                                             |
| `data.colors[].tone`              | string | Hex color value                                                |
| `data.sizes[]`                    | array  | Product size list                                              |
| `data.sizes[].id`                 | int    | Size ID                                                        |
| `data.sizes[].name`               | string | Size name                                                      |
| `data.sizes[].en_name`            | string | English size name                                              |
| `data.tip_levels[]`               | array  | Design quality warning levels                                  |
| `data.tip_levels[].view_id`       | int    | Print view ID                                                  |
| `data.tip_levels[].tip_level`     | int    | Quality level: `0=normal`, `1=minor`, `2=warning`, `3=serious` |
| `data.show_images[]`              | array  | Product mockup/show image groups                               |
| `data.show_images[].color_id`     | int    | Image color ID                                                 |
| `data.show_images[].color_name`   | string | Image color name                                               |
| `data.show_images[].tone`         | string | Hex color value                                                |
| `data.show_images[].images[].src` | string | Product mockup/show image URL                                  |
| `data.variants[]`                 | array  | Product variant list                                           |
| `data.variants[].sku`             | string | Variant SKU                                                    |
| `data.variants[].color_id`        | int    | Variant color ID                                               |
| `data.variants[].size_id`         | int    | Variant size ID                                                |
| `data.variants[].color_name`      | string | Variant color name                                             |
| `data.variants[].size_name`       | string | Variant size name                                              |
| `data.variants[].show_images`     | string | Variant image URL                                              |
| `data.variants[].status`          | int    | Variant status                                                 |
| `data.variants[].status_text`     | string | Variant status text                                            |
| `msg`                             | string | Response message                                               |
| `status`                          | string | Response status, expected `success`                            |
| `status_code`                     | int    | Business status code, expected `200`                           |
| `time`                            | int    | Response time                                                  |
| `uuid`                            | string | Request UUID / trace ID                                        |

### Important Data Gap

The response example shows `variants[].sku`, `color_id`, and `size_id`, but does **not** show `stock_sku_item_id`.

Need to verify from supplier / other Product or Order docs:

```text
How to map a designed product variant to order line item stock_sku_item_id?
```

Possibilities:

1. Order API accepts `product_id + sku`.
2. Order API accepts `product_id + color_id + size_id`.
3. Order API accepts `product_id + stock_sku_item_id`, but this field is omitted from the example.
4. `stock_sku_item_id` from basic product detail `items[].id` remains valid for designed product orders.

This must be confirmed before order creation.

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid product ID.
4. Product belonging to another account.
5. Product still generating / unavailable.
6. Offline product.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. `quickCreate` returned `product_id` can be queried.
2. Response contains matching `data.id`.
3. Response contains `data.basic_product_id`.
4. Response contains `data.code`.
5. Response contains `data.status` and `data.status_text`.
6. Response contains at least one color.
7. Response contains at least one size.
8. Response contains at least one variant.
9. Response contains mockup/show image.
10. Product is orderable or status indicates when it becomes orderable.
11. Design quality `tip_levels` are checked; serious warning should be reported.
12. Variant identifier required for order creation is available or can be derived.

### Fields Needed by Later Steps

```text
supplier_product_id = data.id
supplier_product_code = data.code
supplier_basic_product_id = data.basic_product_id
supplier_product_name = data.name
supplier_product_en_name = data.en_name
supplier_product_status = data.status
supplier_product_status_text = data.status_text
supplier_design_type = data.design_type

supplier_product_colors = data.colors
supplier_product_sizes = data.sizes
supplier_product_variants = data.variants
supplier_product_show_images = data.show_images
supplier_product_tip_levels = data.tip_levels

selected_variant_sku = data.variants[].sku
selected_variant_color_id = data.variants[].color_id
selected_variant_size_id = data.variants[].size_id
selected_variant_status = data.variants[].status
selected_variant_status_text = data.variants[].status_text
selected_variant_image_url = data.variants[].show_images
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/product-detail.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field          | CitiGoo Suggested Field               |
| ----------------------- | ------------------------------------- |
| `data.id`               | `supplier_product_id`                 |
| `data.code`             | `supplier_product_code`               |
| `data.basic_product_id` | `supplier_basic_product_id`           |
| `data.name`             | `supplier_product_name`               |
| `data.status`           | `supplier_product_status`             |
| `data.status_text`      | `supplier_product_status_text`        |
| `data.show_images`      | `supplier_product_mockup_images_json` |
| `data.variants`         | `supplier_product_variants_json`      |
| `data.tip_levels`       | `supplier_design_quality_json`        |
| full response           | `supplier_product_detail_raw_json`    |

### Implementation Notes for Codex

* This is a core endpoint after `Create Product / quickCreate`.
* Use it to confirm generated product is ready before creating an order.
* Do not assume the product is orderable just because `quickCreate` succeeds.
* Check `status` and `status_text`.
* Check variant availability.
* Check `tip_levels`; fail or warn if quality is serious (`tip_level=3`) depending on product policy.
* Save full raw response.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* This endpoint is allowed in no-payment dry-run.

---

## API 18: Get Available Logistics for the Order

### Basic Info

| Field      | Value                                       |
| ---------- | ------------------------------------------- |
| API Name   | Get available logistics for the order       |
| Group      | Order                                       |
| Method     | GET                                         |
| Path       | `/open/v1/logistics/orderLogistics`         |
| Full URL   | `{{host}}/open/v1/logistics/orderLogistics` |
| Encoding   | utf-8                                       |
| Status     | Published                                   |
| Updated At | 2026-02-10 14:07:40                         |

### Description

获取订单可用物流。

For orders that cannot be paid due to logistics channel problems, or orders requiring logistics change, this endpoint returns available logistics options. Then `Update Order Address and Logistics Channel` can be used to update logistics/address before payment.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Request Method Warning

Eolink marks this endpoint as `GET`, but also shows a JSON body example:

```json
{
  "order_no": "1234567-CP11"
}
```

The parameter table says `order_no` is required.

Implementation should verify whether this endpoint expects:

1. GET query parameter: `?order_no=...`;
2. GET with JSON body;
3. POST despite the documented method being GET.

Prefer query parameter style first unless supplier confirms otherwise.

### Query / Body Parameters

| Name       | Required | Type   | Description           |
| ---------- | -------: | ------ | --------------------- |
| `order_no` |      yes | string | Supplier order number |

### Request Example: Query Parameter Style

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/logistics/orderLogistics" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "order_no=$SUPPLIER_ORDER_NO" | jq .
```

### Request Example: JSON Body Style

```bash
curl -sS -X GET "$S2BDIY_BASE_URL/open/v1/logistics/orderLogistics" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "'"$SUPPLIER_ORDER_NO"'"
  }' | jq .
```

### Success Response Example

```json
{
  "data": [
    {
      "name": "云途全球专线挂号（特惠普货）",
      "logistics_platform_id": 2,
      "day_from": 2,
      "day_to": 5,
      "en_name": "云途全球专线挂号（特惠普货）",
      "full_en_name": "Yuntu Global Dedicated Line Reg (General Cargo - Special Discount)",
      "description": "<p>云途专线暂不限制！</p>",
      "amount": "5460.00"
    }
  ],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "uuid": "20faf744-09a5-49a2-8797-7d9828b015b8"
}
```

### Success Response Fields

| Field                          | Type       | Description                                     |
| ------------------------------ | ---------- | ----------------------------------------------- |
| `data[]`                       | array      | Available logistics options                     |
| `data[].name`                  | string     | Logistics channel name                          |
| `data[].logistics_platform_id` | int/string | Logistics channel ID                            |
| `data[].day_from`              | int        | Minimum estimated delivery days                 |
| `data[].day_to`                | int        | Maximum estimated delivery days                 |
| `data[].en_name`               | string     | Logistics channel English name                  |
| `data[].full_en_name`          | string     | Full logistics channel English name             |
| `data[].description`           | string     | Logistics channel description, may contain HTML |
| `data[].amount`                | string     | Logistics price                                 |
| `msg`                          | string     | Response message                                |
| `status`                       | string     | Response status, expected `success`             |
| `status_code`                  | int        | Business status code, expected `200`            |
| `uuid`                         | string     | Request UUID / trace ID                         |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Missing `order_no`.
4. Invalid `order_no`.
5. Order already paid / locked.
6. No logistics available.

### Dry-run Safety

| Check                        | Value                             |
| ---------------------------- | --------------------------------- |
| Creates supplier product?    | NO                                |
| Creates supplier order?      | NO                                |
| Mutates existing order?      | NO                                |
| Charges money?               | NO                                |
| Safe for no-payment dry-run? | YES, after an unpaid order exists |
| Can be repeated?             | YES                               |

### Validation Points

During supplier testing, verify:

1. Unpaid order can query available logistics.
2. Response contains at least one `logistics_platform_id`.
3. Response contains logistics price `amount`.
4. Selected logistics option can be passed to `updateOrderLogistics`.
5. Invalid order number returns clear error.
6. Missing token returns clear auth error.

### Fields Needed by Later Steps

```text
available_logistics_platform_id = data[].logistics_platform_id
available_logistics_name = data[].name
available_logistics_en_name = data[].en_name
available_logistics_full_en_name = data[].full_en_name
available_logistics_amount = data[].amount
available_logistics_day_from = data[].day_from
available_logistics_day_to = data[].day_to
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/order-available-logistics.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                 | CitiGoo Suggested Field                       |
| ------------------------------ | --------------------------------------------- |
| `data[].logistics_platform_id` | `supplier_available_logistics_platform_id`    |
| `data[].name`                  | `supplier_available_logistics_name`           |
| `data[].amount`                | `supplier_available_logistics_amount`         |
| full response                  | `supplier_order_available_logistics_raw_json` |

### Implementation Notes for Codex

* This endpoint is useful after creating an unpaid order if the selected logistics channel is invalid or payment is blocked.
* It should not mutate supplier state.
* It is safe for no-payment dry-run only after an unpaid order exists.
* Verify request format because Eolink shows `GET` but also shows JSON body.
* Prefer query param `order_no` first unless supplier confirms JSON body.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

## API 19: Upload Order Logistics Waybill

### Basic Info

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| API Name         | Upload order logistics waybill             |
| Group            | Order                                      |
| Method           | POST                                       |
| Path             | `/open/v1/order/{id}/logistics`            |
| Example Full URL | `{{host}}/open/v1/order/6966190/logistics` |
| Encoding         | utf-8                                      |
| Status           | Published                                  |
| Updated At       | 2025-12-02 17:04:24                        |

### Description

订单上传物流面单。支付订单后可上传物流面单。

This endpoint uploads a logistics waybill PDF and tracking number for an order after payment.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Content Type Warning

Eolink parameter table says:

```text
file: 面单Pdf二进制文件
track_number: 运单号
```

This suggests `multipart/form-data`.

But Eolink also shows a JSON body example:

```json
{
  "ids": [
    6966190
  ]
}
```

This appears inconsistent with the documented file upload parameters. Implementation must verify the real request format before using this endpoint.

### Path Parameters

| Name | Required | Type | Description              |
| ---- | -------: | ---- | ------------------------ |
| `id` |      yes | int  | Supplier order ID / 订单编号 |

### Request Parameters

| Name           | Required | Type   | Description                            |
| -------------- | -------: | ------ | -------------------------------------- |
| `file`         |      yes | file   | Waybill PDF binary file / 面单 PDF 二进制文件 |
| `track_number` |      yes | string | Tracking number / 运单号                  |

### Possible Request Example: Multipart Upload

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/order/$SUPPLIER_ORDER_ID/logistics" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -F "file=@logs/supplier-single-store-YYYYMMDD-HHMMSS/assets/test-waybill.pdf" \
  -F "track_number=CITIGOO-TEST-TRACKING-001" | jq .
```

### Eolink JSON Body Example

```json
{
  "ids": [
    6966190
  ]
}
```

### Success Response Example

```json
{
  "data": [],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "9ee500ea-48ce-4d48-9d9f-03da1114e7c2"
}
```

### Success Response Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `data`        | array  | Empty array in example               |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid order ID.
4. Order not paid.
5. Order not eligible for waybill upload.
6. Missing PDF file.
7. Non-PDF file.
8. Empty file.
9. Oversized file.
10. Missing tracking number.
11. Duplicate tracking number / duplicate upload.

### Dry-run Safety

| Check                              | Value                              |
| ---------------------------------- | ---------------------------------- |
| Creates supplier product?          | NO                                 |
| Creates supplier order?            | NO                                 |
| Mutates order logistics?           | YES                                |
| Requires paid order?               | YES                                |
| Charges money?                     | NO, but order must already be paid |
| Safe for first no-payment dry-run? | NO                                 |
| Can be repeated?                   | UNKNOWN                            |

### Validation Points

This endpoint should not run in the first no-payment dry-run.

When fulfillment testing is explicitly approved, verify:

1. Paid order accepts PDF waybill.
2. Response returns `status=success`.
3. Order detail shows tracking number.
4. Order status changes appropriately.
5. Duplicate upload behavior is clear.
6. Invalid file type returns clear error.
7. Invalid order ID returns clear error.

### Fields Needed by Later Steps

If tested, save:

```text
supplier_order_id = path id
supplier_tracking_number = request.track_number
supplier_waybill_upload_status = response.status
supplier_waybill_upload_uuid = response.uuid
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/upload-order-waybill.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field         | CitiGoo Suggested Field            |
| ---------------------- | ---------------------------------- |
| path `id`              | `supplier_order_id`                |
| request `track_number` | `tracking_number`                  |
| request `file`         | `waybill_file_reference`           |
| full response          | `supplier_waybill_upload_raw_json` |

### Implementation Notes for Codex

* Do not call this endpoint in the first no-payment dry-run.
* This belongs to later fulfillment / self-owned label testing.
* First prefer platform logistics flow if available.
* Verify request content type before implementation because Eolink shows inconsistent body information.
* Use only synthetic test PDF and synthetic tracking number.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 20: Copy Product

### Basic Info

| Field      | Value                                |
| ---------- | ------------------------------------ |
| API Name   | Copy Product                         |
| Group      | Product                              |
| Method     | POST                                 |
| Path       | `/open/v1/product/{id}/copy`         |
| Full URL   | `{{host}}/open/v1/product/{id}/copy` |
| Encoding   | utf-8                                |
| Status     | Published                            |
| Updated At | 2026-05-21 13:39:15                  |

### Description

复制产品。传入需要复制的产品 ID，返回复制后的新产品 ID。

This endpoint copies an existing designed supplier product and returns the new copied product ID.

### Auth

| Field         | Value                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Auth Required | LIKELY YES                                                                                                            |
| Auth Header   | `Authorization: Bearer <token>`                                                                                       |
| Token Source  | `/open/v1/accessToken`                                                                                                |
| Notes         | Header was not shown in pasted Eolink content, but Product business APIs likely require token. Verify during testing. |

### Path Parameters

| Name | Required | Type       | Description                 |
| ---- | -------: | ---------- | --------------------------- |
| `id` |      yes | string/int | Existing product ID to copy |

### Request Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/product/$SUPPLIER_PRODUCT_ID/copy" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 167591
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "377b0a2c-e87e-4a40-8a4c-3feefc06451b"
}
```

### Success Response Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `data.id`     | int    | New copied product ID                |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid product ID.
4. Product belonging to another user/account.
5. Product not copyable.
6. Copied product quota/limit exceeded.

### Dry-run Safety

| Check                              | Value                               |
| ---------------------------------- | ----------------------------------- |
| Creates supplier product?          | YES                                 |
| Creates supplier order?            | NO                                  |
| Charges money?                     | LIKELY NO, but must verify          |
| Safe for first no-payment dry-run? | NO                                  |
| Can be repeated?                   | YES, but creates duplicate products |

### Validation Points

This endpoint is not required for first single-product dry-run.

If explicitly tested later, verify:

1. Existing product can be copied.
2. Response contains new `data.id`.
3. New product detail can be queried by `GET /open/v1/product/{id}`.
4. Copied product preserves design/material/color/size as expected.
5. Invalid product ID returns clear error.

### Fields Needed by Later Steps

If used, save:

```text
copied_supplier_product_id = data.id
source_supplier_product_id = path id
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/copy-product.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field | CitiGoo Suggested Field          |
| -------------- | -------------------------------- |
| path `id`      | `source_supplier_product_id`     |
| `data.id`      | `copied_supplier_product_id`     |
| full response  | `supplier_copy_product_raw_json` |

### Implementation Notes for Codex

* Do not call this endpoint in the first no-payment dry-run.
* This endpoint mutates supplier product state by creating another product.
* Prefer `quickCreate` for first product generation test.
* Use this later only if product duplication is part of the business flow.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 21: Get Products

### Basic Info

| Field      | Value                      |
| ---------- | -------------------------- |
| API Name   | Get products               |
| Group      | Product                    |
| Method     | GET                        |
| Path       | `/open/v1/product`         |
| Full URL   | `{{host}}/open/v1/product` |
| Encoding   | utf-8                      |
| Status     | Published                  |
| Updated At | 2026-01-15 14:00:01        |

### Description

获取设计产品列表。使用产品 ID 数据进行后续下单操作。

This endpoint lists designed supplier products. It can be used to find or verify products after creation and to retrieve product IDs for later order creation.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Query Parameters

| Name       | Required | Type   | Description                             |
| ---------- | -------: | ------ | --------------------------------------- |
| `name`     |       no | string | Product name                            |
| `batch_id` |       no | string | Batch design ID                         |
| `ids`      |      yes | string | Comma-separated product IDs, e.g. `1,2` |

### Query Parameter Warning

Eolink marks `ids` as required, but the endpoint is named "Get products" and includes pagination fields. Need to verify whether `ids` is truly required or only required for filtering specific products.

Implementation should support both:

1. Query by known product IDs after `quickCreate`.
2. Optional listing if supplier allows no `ids`.

### Request Example: Query By Product IDs

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/product" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "ids=$SUPPLIER_PRODUCT_ID" | jq .
```

### Request Example: Query By Name

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/product" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "name=CitiGoo dry-run T-shirt" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 11907,
        "code": "U65JPA",
        "name": "キャプテン・アメリカ A (2)",
        "en_name": "キャプテン・アメリカ A (2)",
        "basic_product_id": 105,
        "design_type": 1,
        "is_buyer_design": 2,
        "username": "QAQxmm",
        "colors": [
          {
            "id": 6,
            "name": "白色",
            "en_name": "White",
            "tone": "#FFFFFF"
          }
        ],
        "sizes": [
          {
            "id": 59,
            "name": "18x18 Inch",
            "en_name": "18x18 Inch"
          }
        ],
        "tip_levels": [
          {
            "view_id": 1,
            "background": "",
            "tip_level": 3
          }
        ],
        "show_master_image": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/showImages/U65JPA_6_1.jpg",
        "design_type_text": "简单商品",
        "status_text": "上架"
      }
    ],
    "first_page_url": "http://open.s2bdiy.local/open/v1/product?page=1",
    "from": 1,
    "last_page": 57,
    "last_page_url": "http://open.s2bdiy.local/open/v1/product?page=57",
    "links": [],
    "next_page_url": "http://open.s2bdiy.local/open/v1/product?page=2",
    "path": "http://open.s2bdiy.local/open/v1/product",
    "per_page": 1,
    "prev_page_url": null,
    "to": 1,
    "total": 57
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "3931cebe-f837-4e40-ae80-a053d5977f40"
}
```

### Success Response Fields

| Field                                | Type   | Description                                                           |
| ------------------------------------ | ------ | --------------------------------------------------------------------- |
| `data.current_page`                  | int    | Current page                                                          |
| `data.data[]`                        | array  | Designed product list                                                 |
| `data.data[].id`                     | int    | Designed product ID                                                   |
| `data.data[].basic_product_id`       | int    | Basic product ID                                                      |
| `data.data[].code`                   | string | Product code                                                          |
| `data.data[].name`                   | string | Product name                                                          |
| `data.data[].en_name`                | string | English product name                                                  |
| `data.data[].design_type`            | int    | Design type                                                           |
| `data.data[].design_type_text`       | string | Design type text                                                      |
| `data.data[].is_buyer_design`        | int    | Whether buyer design flag                                             |
| `data.data[].username`               | string | Username                                                              |
| `data.data[].colors[]`               | array  | Color list                                                            |
| `data.data[].colors[].id`            | int    | Color ID                                                              |
| `data.data[].colors[].name`          | string | Color name                                                            |
| `data.data[].colors[].en_name`       | string | English color name                                                    |
| `data.data[].colors[].tone`          | string | Hex color value                                                       |
| `data.data[].sizes[]`                | array  | Size list                                                             |
| `data.data[].sizes[].id`             | int    | Size ID                                                               |
| `data.data[].sizes[].name`           | string | Size name                                                             |
| `data.data[].sizes[].en_name`        | string | English size name                                                     |
| `data.data[].tip_levels[]`           | array  | Design quality prompt                                                 |
| `data.data[].tip_levels[].view_id`   | int    | Print view ID                                                         |
| `data.data[].tip_levels[].tip_level` | int    | Design quality level: `0=normal`, `1=minor`, `2=warning`, `3=serious` |
| `data.data[].show_master_image`      | string | Product display/master image                                          |
| `data.data[].status_text`            | string | Product listing/status text                                           |
| `data.total`                         | int    | Total product count                                                   |
| `data.per_page`                      | int    | Page size                                                             |
| `msg`                                | string | Response message                                                      |
| `status`                             | string | Response status, expected `success`                                   |
| `status_code`                        | int    | Business status code, expected `200`                                  |
| `time`                               | int    | Response time                                                         |
| `uuid`                               | string | Request UUID / trace ID                                               |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid product ID in `ids`.
4. Nonexistent product ID.
5. Product belonging to another account.
6. Missing `ids` if truly required.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Query by `ids=$SUPPLIER_PRODUCT_ID` works after `quickCreate`.
2. Response includes created product ID.
3. Response contains `status_text`.
4. Response contains color/size lists.
5. Response contains `show_master_image`.
6. Missing/invalid token returns clear auth error.
7. Invalid product ID returns clear error or empty list.
8. Clarify whether `ids` is mandatory.

### Fields Needed by Later Steps

```text
supplier_product_id = data.data[].id
supplier_product_code = data.data[].code
supplier_basic_product_id = data.data[].basic_product_id
supplier_product_name = data.data[].name
supplier_product_en_name = data.data[].en_name
supplier_product_status_text = data.data[].status_text
supplier_product_design_type = data.data[].design_type
supplier_product_design_type_text = data.data[].design_type_text
supplier_product_colors = data.data[].colors
supplier_product_sizes = data.data[].sizes
supplier_product_tip_levels = data.data[].tip_levels
supplier_product_master_image = data.data[].show_master_image
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/products.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                  | CitiGoo Suggested Field             |
| ------------------------------- | ----------------------------------- |
| `data.data[].id`                | `supplier_product_id`               |
| `data.data[].code`              | `supplier_product_code`             |
| `data.data[].basic_product_id`  | `supplier_basic_product_id`         |
| `data.data[].name`              | `supplier_product_name`             |
| `data.data[].status_text`       | `supplier_product_status_text`      |
| `data.data[].show_master_image` | `supplier_product_master_image_url` |
| `data.data[].colors`            | `supplier_product_colors_json`      |
| `data.data[].sizes`             | `supplier_product_sizes_json`       |
| `data.data[].tip_levels`        | `supplier_design_quality_json`      |
| full response                   | `supplier_product_list_raw_json`    |

### Implementation Notes for Codex

* This endpoint is useful after `quickCreate` to verify that the designed product is listed.
* For exact lookup, use `ids=$SUPPLIER_PRODUCT_ID`.
* For first dry-run, prefer `GET /open/v1/product/{id}` for detailed verification, and optionally call this list endpoint as secondary verification.
* Do not mutate supplier state.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

## API 22: Pay Orders

### Basic Info

| Field      | Value                       |
| ---------- | --------------------------- |
| API Name   | Pay orders                  |
| Group      | Order                       |
| Method     | POST                        |
| Path       | `/open/v1/orderPay`         |
| Full URL   | `{{host}}/open/v1/orderPay` |
| Encoding   | utf-8                       |
| Status     | Published                   |
| Updated At | 2025-12-02 17:04:49         |

### Description

支付订单。

This endpoint pays one or more supplier orders. Calling this endpoint may deduct supplier account balance and move the order into production/fulfillment workflow.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Content Type

```http
Content-Type: application/json
```

### Request Body Parameters

| Name  | Required | Type  | Description                     |
| ----- | -------: | ----- | ------------------------------- |
| `ids` |      yes | array | Supplier order ID list / 订单编号列表 |

### Request Example From Eolink

```json
{
  "ids": [
    6966190
  ]
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/orderPay" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ['"$SUPPLIER_ORDER_ID"']
  }' | jq .
```

### Success Response Example

```json
{
  "data": [],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "c94e7849-4354-4138-bae7-97dc606cb037"
}
```

### Success Response Fields

| Field         | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `data`        | array  | Empty array in example               |
| `msg`         | string | Response message                     |
| `status`      | string | Response status, expected `success`  |
| `status_code` | int    | Business status code, expected `200` |
| `time`        | int    | Response time                        |
| `uuid`        | string | Request UUID / trace ID              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid order ID.
4. Order already paid.
5. Order cancelled.
6. Insufficient balance.
7. Logistics channel unavailable.
8. Duplicate payment request.
9. Order not payable because address/logistics is invalid.

### Dry-run Safety

| Check                        | Value                                                            |
| ---------------------------- | ---------------------------------------------------------------- |
| Creates supplier product?    | NO                                                               |
| Creates supplier order?      | NO                                                               |
| Mutates order payment state? | YES                                                              |
| Charges money?               | YES / HIGH RISK                                                  |
| Safe for no-payment dry-run? | NO                                                               |
| Can be repeated?             | UNKNOWN; must test duplicate payment only with explicit approval |

### Payment Safety Gate

Do not call this endpoint unless all conditions are true:

```text
SUPPLIER_ALLOW_PAYMENT=true
S2BDIY_TEST_MODE=true
HUMAN_APPROVED_PAYMENT=true
confirmed_test_environment=true
balance_sufficient=true
order_total_amount_confirmed=true
```

### Validation Points

For later payment testing only, verify:

1. Unpaid order can be paid successfully.
2. Payment deducts expected amount only.
3. `Get order detail` changes `pay_status` to `3=支付完成`.
4. Order status changes according to supplier workflow.
5. Repeated payment does not double-charge.
6. Insufficient balance returns clear error.
7. Invalid order ID returns clear error.
8. Already paid order returns clear error or idempotent success.

### Fields Needed by Later Steps

```text
supplier_order_id = request.ids[]
supplier_payment_status = response.status
supplier_payment_uuid = response.uuid
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/order-pay.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field    | CitiGoo Suggested Field          |
| ----------------- | -------------------------------- |
| request `ids[]`   | `supplier_order_id`              |
| response `status` | `supplier_payment_result_status` |
| response `uuid`   | `supplier_payment_request_uuid`  |
| full response     | `supplier_order_pay_raw_json`    |

### Implementation Notes for Codex

* Do not call this endpoint in the default no-payment dry-run.
* This endpoint is explicitly payment-related and may trigger real balance deduction.
* The dry-run script must always skip this endpoint unless a human explicitly approves payment.
* Always query `Get order detail` before payment and after payment.
* Store payment status separately from order creation status.
* Never treat "Create order success" as "Payment success".
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 23: Get Order Detail

### Basic Info

| Field            | Value                            |
| ---------------- | -------------------------------- |
| API Name         | Get order detail                 |
| Group            | Order                            |
| Method           | GET                              |
| Path             | `/open/v1/order/{id}`            |
| Example Full URL | `{{host}}/open/v1/order/6966190` |
| Encoding         | utf-8                            |
| Status           | Published                        |
| Updated At       | 2025-12-02 17:05:02              |

### Description

获取订单详情，查看订单详细信息，包括订单状态、支付状态、商品费用、运费、总金额、订单项、物流信息、收货地址等。

This endpoint is the key source for supplier order pricing and fulfillment status.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Path Parameters

| Name | Required | Type       | Description       |
| ---- | -------: | ---------- | ----------------- |
| `id` |      yes | int/string | Supplier order ID |

### Request Example

```bash
curl -sS "$S2BDIY_BASE_URL/open/v1/order/$SUPPLIER_ORDER_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 95179,
    "third_order_id": "58a1a97f-3968-4e77-844b-a661376298c5",
    "payment_time": "2023-03-31 17:51:41",
    "verify_time": "2023-03-31 17:52:04",
    "produced_time": "2023-03-31 17:55:38",
    "delivery_time": "2023-03-31 18:03:47",
    "platform": 99,
    "store_id": 1418,
    "total_item_num": 2,
    "total_num": 4,
    "logistics_platform": 13,
    "status": 6,
    "pay_status": 3,
    "created_at": "2023-03-31 17:51:39",
    "updated_at": "2025-03-12 19:31:43",
    "product_amount": 9.5,
    "discount_amount": 0,
    "shipping_amount": 167.93,
    "total_amount": 177.93,
    "status_text": "已发货",
    "pay_status_text": "支付完成",
    "platform_text": "其他",
    "logistics_platform_text": "DHL物流_sort_97",
    "order_items": [
      {
        "id": 15500,
        "code": "7KJUJ3-1",
        "third_item_id": "7KJUJ3-1",
        "basic_product_id": 1390,
        "product_id": 3803,
        "product_name": "cbdda796bf239d5b714291b8c0dcece9",
        "num": 3,
        "third_sku": "",
        "product_amount": 0,
        "discount_amount": 0,
        "total_amount": 0,
        "total_weight": 1005,
        "color_id": 6,
        "size_id": 194,
        "show_image": "https://snb-bucket.oss-cn-hangzhou.aliyuncs.com/showImages/NC5S3A_6_1.jpg",
        "asin": "",
        "basic_product_name": "优质帆布无框装饰画一横版",
        "color_name": "白色",
        "size_name": "8x12 Inch"
      }
    ],
    "order_logistics": {
      "logistics_platform": 13,
      "logisticss_country": "CN",
      "address_country": "US",
      "logisticss_track_number": "6199397886",
      "logisticss_time": "2023-03-31 18:03:47",
      "logisticss_status": 7,
      "status": 1,
      "platform_logistics_weight": 1325,
      "logistics_receipt_time": null,
      "logistics_distribution_time": null,
      "logistics_sign_time": null,
      "oss_file_src": "https://snbtestoss.oss-cn-hangzhou.aliyuncs.com/logisticsList/16021a1abbe02af4ec51da63e8405c5e.pdf"
    },
    "order_address": {
      "firstname": "Yuikonnu",
      "lastname": "第二名称",
      "country": "US",
      "province": "California",
      "city": "Glendora",
      "area": "Los Angeles",
      "street": "1959 Auto Center Dr.",
      "postcode": "91741",
      "email": "",
      "remark": "填一个",
      "mobile_phone": "(909) 394-9899",
      "address": "1958 Auto Center Dr.",
      "ioss_number": "",
      "is_eu": 0
    }
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "c94e7849-4354-4138-bae7-97dc606cb037"
}
```

### Key Pricing Fields

| Field                  | Type  | Description                 |
| ---------------------- | ----- | --------------------------- |
| `data.product_amount`  | float | Product amount / 订单货款       |
| `data.discount_amount` | float | Discount amount / 订单折扣      |
| `data.shipping_amount` | float | Shipping amount / 订单运费      |
| `data.total_amount`    | float | Total payable amount / 订单总额 |

### Key Status Fields

| Field                  | Type   | Description         |
| ---------------------- | ------ | ------------------- |
| `data.status`          | int    | Order status        |
| `data.status_text`     | string | Order status text   |
| `data.pay_status`      | int    | Payment status      |
| `data.pay_status_text` | string | Payment status text |

### Order Status Mapping

| Value | Meaning |
| ----: | ------- |
|   `1` | 未确认     |
|   `2` | 未付款     |
|   `3` | 审核中     |
|   `4` | 排单中     |
|   `5` | 生产中     |
|   `6` | 已发货     |
|   `7` | 已取消     |

### Payment Status Mapping

| Value | Meaning |
| ----: | ------- |
|   `1` | 待支付     |
|   `2` | 支付中     |
|   `3` | 支付完成    |
|   `4` | 支付失败    |

### Order Item Fields

| Field                                   | Type   | Description                  |
| --------------------------------------- | ------ | ---------------------------- |
| `data.order_items[]`                    | array  | Order item list              |
| `data.order_items[].id`                 | int    | Order item ID                |
| `data.order_items[].code`               | string | Order item code              |
| `data.order_items[].third_item_id`      | string | External order item ID       |
| `data.order_items[].basic_product_id`   | int    | Basic product ID             |
| `data.order_items[].product_id`         | int    | Designed supplier product ID |
| `data.order_items[].product_name`       | string | Product name                 |
| `data.order_items[].num`                | int    | Quantity                     |
| `data.order_items[].third_sku`          | string | External SKU                 |
| `data.order_items[].product_amount`     | float  | Item product amount          |
| `data.order_items[].discount_amount`    | float  | Item discount amount         |
| `data.order_items[].total_amount`       | float  | Item total amount            |
| `data.order_items[].total_weight`       | int    | Item total weight in grams   |
| `data.order_items[].color_id`           | int    | Color ID                     |
| `data.order_items[].size_id`            | int    | Size ID                      |
| `data.order_items[].show_image`         | string | Product image URL            |
| `data.order_items[].asin`               | string | ASIN                         |
| `data.order_items[].basic_product_name` | string | Basic product name           |
| `data.order_items[].color_name`         | string | Color name                   |
| `data.order_items[].size_name`          | string | Size name                    |

### Order Logistics Fields

| Field                                            | Type   | Description                                 |
| ------------------------------------------------ | ------ | ------------------------------------------- |
| `data.order_logistics.logistics_platform`        | int    | Logistics platform/channel ID               |
| `data.order_logistics.logisticss_country`        | string | Shipping origin country                     |
| `data.order_logistics.address_country`           | string | Destination country                         |
| `data.order_logistics.logisticss_track_number`   | string | Tracking number                             |
| `data.order_logistics.logisticss_time`           | string | Shipment time                               |
| `data.order_logistics.logisticss_status`         | int    | Logistics status                            |
| `data.order_logistics.status`                    | int    | Waybill/logistics generation status         |
| `data.order_logistics.platform_logistics_weight` | int    | Supplier standard logistics weight in grams |
| `data.order_logistics.oss_file_src`              | string | Waybill file URL                            |

### Logistics Status Mapping

| Value | Meaning |
| ----: | ------- |
|   `1` | 等待寄送    |
|   `2` | 运输途中    |
|   `3` | 到达待取    |
|   `4` | 成功签收    |
|   `5` | 运输过久    |
|   `6` | 投递失败    |
|   `7` | 可能异常    |
|   `8` | 物流取消    |
|   `9` | 已退件销毁   |
|  `10` | 已退件回收   |
|  `11` | 待揽收     |
|  `12` | 已丢件     |

### Address Fields

| Field                                 | Type   | Description             |
| ------------------------------------- | ------ | ----------------------- |
| `data.order_address.firstname`        | string | First name              |
| `data.order_address.lastname`         | string | Last name               |
| `data.order_address.country`          | string | Country                 |
| `data.order_address.province`         | string | Province/state          |
| `data.order_address.city`             | string | City                    |
| `data.order_address.area`             | string | Area                    |
| `data.order_address.street`           | string | Street                  |
| `data.order_address.postcode`         | string | Postal code             |
| `data.order_address.email`            | string | Email                   |
| `data.order_address.mobile_phone`     | string | Mobile phone            |
| `data.order_address.remark`           | string | Remark                  |
| `data.order_address.address`          | string | Detailed address        |
| `data.order_address.ioss_number`      | string | IOSS/tax number         |
| `data.order_address.certificate_code` | string | Brazil/Chile tax number |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid order ID.
4. Order belonging to another account.
5. Cancelled order.
6. Deleted or unavailable order.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Created order can be queried by returned `data.id`.
2. `third_order_id` matches CitiGoo external order ID.
3. `pay_status` is `1=待支付` or expected unpaid state before payment.
4. `status` is `1=未确认` or `2=未付款` before payment.
5. `product_amount` is present.
6. `shipping_amount` is present.
7. `discount_amount` is present.
8. `total_amount` is present.
9. `total_amount` equals expected payable amount from supplier.
10. `order_items[]` reflects requested product, size, color, quantity.
11. `order_logistics` reflects selected logistics channel.
12. Tracking fields are empty before shipment and populated after fulfillment.

### Fields Needed by Later Steps

```text
supplier_order_id = data.id
external_order_id = data.third_order_id
supplier_order_status = data.status
supplier_order_status_text = data.status_text
supplier_pay_status = data.pay_status
supplier_pay_status_text = data.pay_status_text
supplier_product_amount = data.product_amount
supplier_discount_amount = data.discount_amount
supplier_shipping_amount = data.shipping_amount
supplier_total_amount = data.total_amount
supplier_logistics_platform = data.logistics_platform
supplier_logistics_platform_text = data.logistics_platform_text
supplier_tracking_number = data.order_logistics.logisticss_track_number
supplier_order_items = data.order_items
supplier_order_address = data.order_address
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/order-detail.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field         | CitiGoo Suggested Field          |
| ---------------------- | -------------------------------- |
| `data.id`              | `supplier_order_id`              |
| `data.third_order_id`  | `external_order_id`              |
| `data.status`          | `supplier_order_status`          |
| `data.status_text`     | `supplier_order_status_text`     |
| `data.pay_status`      | `supplier_pay_status`            |
| `data.pay_status_text` | `supplier_pay_status_text`       |
| `data.product_amount`  | `supplier_product_amount`        |
| `data.shipping_amount` | `supplier_shipping_amount`       |
| `data.discount_amount` | `supplier_discount_amount`       |
| `data.total_amount`    | `supplier_total_amount`          |
| `data.order_items`     | `supplier_order_items_json`      |
| `data.order_logistics` | `supplier_order_logistics_json`  |
| `data.order_address`   | `supplier_order_address_json`    |
| full response          | `supplier_order_detail_raw_json` |

### Implementation Notes for Codex

* This is the main endpoint for extracting final supplier payable amount.
* The dry-run should stop after this endpoint unless payment is explicitly approved.
* Preserve money fields using safe decimal handling.
* Do not calculate supplier cost only from product list or logistics quote; final amount must come from order detail.
* Mask `Authorization` token in logs.
* Mask personal address and phone if using non-synthetic data.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 24: Get Orders

### Basic Info

| Field      | Value                    |
| ---------- | ------------------------ |
| API Name   | Get orders               |
| Group      | Order                    |
| Method     | GET                      |
| Path       | `/open/v1/order`         |
| Full URL   | `{{host}}/open/v1/order` |
| Encoding   | utf-8                    |
| Status     | Published                |
| Updated At | 2025-12-02 17:05:19      |

### Description

获取订单列表，查看订单简要信息。

This endpoint lists supplier orders and can be used for polling, order synchronization, and checking whether a created order exists.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Query Parameters

| Name             | Required | Type   | Description                                                                 |
| ---------------- | -------: | ------ | --------------------------------------------------------------------------- |
| `status`         |       no | int    | Order status: `1=未确认`, `2=未付款`, `3=审核中`, `4=排单中`, `5=生产中`, `6=已发货`, `7=已取消` |
| `third_order_id` |       no | string | External order ID submitted by Open app                                     |
| `pay_status`     |       no | int    | Payment status: `1=待支付`, `2=支付中`, `3=支付完成`, `4=支付失败`                        |

### Request Example

```bash
curl -sS -G "$S2BDIY_BASE_URL/open/v1/order" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  --data-urlencode "third_order_id=$EXTERNAL_ORDER_ID" \
  --data-urlencode "pay_status=1" | jq .
```

### Success Response Example

```json
{
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 95179,
        "third_order_id": "58a1a97f-3968-4e77-844b-a661376298c5",
        "payment_time": "2023-03-31 17:51:41",
        "verify_time": "2023-03-31 17:52:04",
        "produced_time": "2023-03-31 17:55:38",
        "delivery_time": "2023-03-31 18:03:47",
        "platform": 99,
        "store_id": 1418,
        "total_item_num": 2,
        "total_num": 4,
        "logistics_platform": 13,
        "status": 6,
        "pay_status": 3,
        "created_at": "2023-03-31 17:51:39",
        "updated_at": "2025-03-12 19:31:43",
        "status_text": "已发货",
        "pay_status_text": "支付完成",
        "platform_text": "其他",
        "logistics_platform_text": "DHL物流_sort_97",
        "product_amount": 9.5,
        "discount_amount": 0,
        "shipping_amount": 167.93,
        "total_amount": 177.93
      }
    ],
    "first_page_url": "http://open.s2bdiy.local/open/v1/order?page=1",
    "from": 1,
    "last_page": 38,
    "last_page_url": "http://open.s2bdiy.local/open/v1/order?page=38",
    "links": [],
    "next_page_url": "http://open.s2bdiy.local/open/v1/order?page=2",
    "path": "http://open.s2bdiy.local/open/v1/order",
    "per_page": 1,
    "prev_page_url": null,
    "to": 1,
    "total": 38
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1,
  "uuid": "2f226a23-9944-4c5f-830c-b78a2434d5aa"
}
```

### Success Response Fields

| Field                                 | Type   | Description            |
| ------------------------------------- | ------ | ---------------------- |
| `data.current_page`                   | int    | Current page           |
| `data.data[]`                         | array  | Order list             |
| `data.data[].id`                      | int    | Supplier order ID      |
| `data.data[].third_order_id`          | string | External order ID      |
| `data.data[].payment_time`            | string | Payment time           |
| `data.data[].verify_time`             | string | Verification time      |
| `data.data[].produced_time`           | string | Production time        |
| `data.data[].delivery_time`           | string | Delivery time          |
| `data.data[].platform`                | int    | Platform channel       |
| `data.data[].store_id`                | int    | Supplier shop/store ID |
| `data.data[].total_item_num`          | int    | Number of order items  |
| `data.data[].total_num`               | int    | Total quantity         |
| `data.data[].logistics_platform`      | int    | Logistics channel ID   |
| `data.data[].status`                  | int    | Order status           |
| `data.data[].pay_status`              | int    | Payment status         |
| `data.data[].status_text`             | string | Order status text      |
| `data.data[].pay_status_text`         | string | Payment status text    |
| `data.data[].platform_text`           | string | Platform text          |
| `data.data[].logistics_platform_text` | string | Logistics text         |
| `data.data[].product_amount`          | float  | Product amount         |
| `data.data[].discount_amount`         | float  | Discount amount        |
| `data.data[].shipping_amount`         | float  | Shipping amount        |
| `data.data[].total_amount`            | float  | Total amount           |
| `data.total`                          | int    | Total order count      |
| `data.per_page`                       | int    | Page size              |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid `status`.
4. Invalid `pay_status`.
5. Unknown `third_order_id`.
6. Empty order list.

### Dry-run Safety

| Check                        | Value |
| ---------------------------- | ----- |
| Creates supplier product?    | NO    |
| Creates supplier order?      | NO    |
| Charges money?               | NO    |
| Safe for no-payment dry-run? | YES   |
| Can be repeated?             | YES   |

### Validation Points

During supplier dry-run, verify:

1. Created order can be found by `third_order_id`.
2. Order list shows same supplier order ID as Create Order response.
3. `status` filter works.
4. `pay_status` filter works.
5. Price summary matches Get Order Detail.
6. Missing/invalid token returns clear auth error.

### Fields Needed by Later Steps

```text
supplier_order_id = data.data[].id
external_order_id = data.data[].third_order_id
supplier_order_status = data.data[].status
supplier_order_status_text = data.data[].status_text
supplier_pay_status = data.data[].pay_status
supplier_pay_status_text = data.data[].pay_status_text
supplier_product_amount = data.data[].product_amount
supplier_shipping_amount = data.data[].shipping_amount
supplier_discount_amount = data.data[].discount_amount
supplier_total_amount = data.data[].total_amount
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/orders.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field                | CitiGoo Suggested Field        |
| ----------------------------- | ------------------------------ |
| `data.data[].id`              | `supplier_order_id`            |
| `data.data[].third_order_id`  | `external_order_id`            |
| `data.data[].status`          | `supplier_order_status`        |
| `data.data[].pay_status`      | `supplier_pay_status`          |
| `data.data[].product_amount`  | `supplier_product_amount`      |
| `data.data[].shipping_amount` | `supplier_shipping_amount`     |
| `data.data[].total_amount`    | `supplier_total_amount`        |
| full response                 | `supplier_order_list_raw_json` |

### Implementation Notes for Codex

* Use this endpoint for order synchronization and polling.
* Use `third_order_id` filter to avoid scanning unrelated orders.
* Do not rely only on order list for final detail; use `GET /open/v1/order/{id}` for full detail.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.

---

## API 25: Create Order

### Basic Info

| Field      | Value                    |
| ---------- | ------------------------ |
| API Name   | Create order             |
| Group      | Order                    |
| Method     | POST                     |
| Path       | `/open/v1/order`         |
| Full URL   | `{{host}}/open/v1/order` |
| Encoding   | utf-8                    |
| Status     | Published                |
| Updated At | 2026-04-08 15:32:25      |

### Description

创建供应商订单。

Important supplier note: when placing an order on the S2B platform, `logistics_id` must be provided. Otherwise, the order may become unpayable and must be fixed by updating order logistics before payment.

`logistics_platform_id` returned by shipping quote APIs can be used as `logistics_id`.

### Auth

| Field         | Value                           |
| ------------- | ------------------------------- |
| Auth Required | YES                             |
| Auth Header   | `Authorization: Bearer <token>` |
| Token Source  | `/open/v1/accessToken`          |

### Content Type

```http
Content-Type: application/json
```

### Request Body Parameters

| Name                              | Required | Type   | Description                                              |
| --------------------------------- | -------: | ------ | -------------------------------------------------------- |
| `third_order_id`                  |      yes | string | External order ID submitted by Open app. Must be unique. |
| `third_user_id`                   |       no | string | External user ID submitted by Open app                   |
| `platform`                        |      yes | int    | Platform channel. See Third platform channels document.  |
| `store_id`                        |      yes | int    | Supplier shop/store ID                                   |
| `remark`                          |       no | string | Remark                                                   |
| `logistics_id`                    |      yes | int    | Logistics channel ID                                     |
| `address`                         |      yes | object | Shipping address                                         |
| `address.firstname`               |      yes | string | First name                                               |
| `address.lastname`                |       no | string | Last name                                                |
| `address.country`                 |      yes | string | Country code, e.g. `CN`, `US`                            |
| `address.province`                |      yes | string | Province/state                                           |
| `address.city`                    |      yes | string | City                                                     |
| `address.postcode`                |      yes | string | Postal code                                              |
| `address.mobile_phone`            |      yes | string | Phone number                                             |
| `address.address`                 |      yes | string | Detailed address                                         |
| `address.ioss`                    |       no | string | Tax number                                               |
| `items`                           |      yes | array  | Order items                                              |
| `items[].third_product_id`        |      yes | string | External product ID submitted by Open app                |
| `items[].third_product_image_url` |       no | string | External product image URL                               |
| `items[].product_id`              |      yes | int    | Designed supplier product ID                             |
| `items[].num`                     |      yes | int    | Quantity                                                 |
| `items[].size_id`                 |      yes | int    | Size ID                                                  |
| `items[].color_id`                |      yes | int    | Color ID                                                 |

### Important Order Item Mapping

Create Order uses:

```text
product_id + size_id + color_id
```

It does **not** document `stock_sku_item_id`.

For the dry-run:

```text
product_id = data.product_id from quickCreate or data.id from Get Product Detail
size_id = selected size_id from Basic Product Detail / Get Product Detail
color_id = selected color_id from Basic Product Detail / Get Product Detail
```

### Request Example From Eolink

```json
{
  "third_order_id": "test001",
  "third_user_id": 1,
  "platform": 2,
  "store_id": 406,
  "remark": "test",
  "logistics_id": 999,
  "address": {
    "firstname": "first name",
    "lastname": "last name",
    "country": "US",
    "province": "huashengdun",
    "city": "ces",
    "postcode": 3666656,
    "mobile_phone": "+1563254",
    "address": "jshhgnh jkswjhgh ljshjgj",
    "ioss": 541
  },
  "items": [
    {
      "third_product_id": 23232323,
      "third_product_image_url": "https://image.s2bdiy.com/showImages/E5BN4V_6_1.jpg",
      "product_id": 1783,
      "num": 3,
      "size_id": 20,
      "color_id": 6
    }
  ]
}
```

### curl Example

```bash
curl -sS -X POST "$S2BDIY_BASE_URL/open/v1/order" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "third_order_id": "'"$EXTERNAL_ORDER_ID"'",
    "third_user_id": "citigoo-smoke-user",
    "platform": 99,
    "store_id": '"$SUPPLIER_SHOP_ID"',
    "remark": "CitiGoo supplier dry-run order. Do not pay by default.",
    "logistics_id": '"$SUPPLIER_LOGISTICS_PLATFORM_ID"',
    "address": {
      "firstname": "CitiGoo",
      "lastname": "SmokeTest",
      "country": "US",
      "province": "CA",
      "city": "Los Angeles",
      "postcode": "90001",
      "mobile_phone": "+10000000000",
      "address": "123 Test Street",
      "ioss": ""
    },
    "items": [
      {
        "third_product_id": "'"$EXTERNAL_PRODUCT_ID"'",
        "third_product_image_url": "'"$SUPPLIER_PRODUCT_IMAGE_URL"'",
        "product_id": '"$SUPPLIER_PRODUCT_ID"',
        "num": 1,
        "size_id": '"$SELECTED_SIZE_ID"',
        "color_id": '"$SELECTED_COLOR_ID"'
      }
    ]
  }' | jq .
```

### Success Response Example

```json
{
  "data": {
    "id": 929,
    "third_order_id": "test002"
  },
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "uuid": "5e474694-cdfb-45b1-93f9-f9109f09f064"
}
```

### Success Response Fields

| Field                 | Type   | Description                             |
| --------------------- | ------ | --------------------------------------- |
| `data.id`             | int    | Supplier order ID                       |
| `data.third_order_id` | string | External order ID submitted by Open app |
| `msg`                 | string | Response message                        |
| `status`              | string | Response status, expected `success`     |
| `status_code`         | int    | Business status code, expected `200`    |
| `uuid`                | string | Request UUID / trace ID                 |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Duplicate `third_order_id`.
4. Missing `logistics_id`.
5. Invalid logistics ID.
6. Invalid store ID.
7. Invalid product ID.
8. Invalid color ID.
9. Invalid size ID.
10. Invalid address.
11. Quantity `num=0`.
12. Unsupported country/postcode.
13. Product not orderable.
14. Logistics unavailable.

### Dry-run Safety

| Check                        | Value                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Creates supplier product?    | NO                                                                                       |
| Creates supplier order?      | YES                                                                                      |
| Charges money immediately?   | LIKELY NO, because payment is separate via `/open/v1/orderPay`, but verify with supplier |
| Safe for no-payment dry-run? | YES, if supplier confirms Create Order does not charge                                   |
| Can be repeated?             | Must use unique `third_order_id`; duplicate behavior should be tested carefully          |

### Validation Points

During supplier dry-run, verify:

1. Create Order returns `data.id`.
2. Returned `third_order_id` matches the submitted external order ID.
3. Duplicate `third_order_id` does not create a second order.
4. The created order is unpaid before `orderPay`.
5. `Get Order Detail` returns pricing fields.
6. `product_amount`, `shipping_amount`, `discount_amount`, and `total_amount` are available.
7. `pay_status` is unpaid before payment.
8. `status` is unpaid/unconfirmed before payment.
9. Missing `logistics_id` causes clear error or unpayable state.
10. Invalid product/color/size returns clear error.

### Fields Needed by Later Steps

```text
supplier_order_id = data.id
external_order_id = data.third_order_id
supplier_order_create_uuid = response.uuid
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/create-order.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field         | CitiGoo Suggested Field             |
| ---------------------- | ----------------------------------- |
| `data.id`              | `supplier_order_id`                 |
| `data.third_order_id`  | `external_order_id`                 |
| request `platform`     | `supplier_platform_id`              |
| request `store_id`     | `supplier_shop_id`                  |
| request `logistics_id` | `supplier_logistics_id`             |
| request `items`        | `supplier_order_items_request_json` |
| full response          | `supplier_create_order_raw_json`    |

### Implementation Notes for Codex

* This is a core endpoint for the supplier dry-run, but only after confirming Create Order does not charge.
* Use a unique `third_order_id`, e.g. `citigoo-smoke-YYYYMMDD-HHMMSS`.
* Always query `Get Order Detail` immediately after order creation.
* Do not call `orderPay` by default.
* Use synthetic test address only.
* Do not use real customer PII.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
* If Create Order itself charges money in this environment, do not call this endpoint in dry-run.

---

## API 26: Cancel an Order

### Basic Info

| Field      | Value                         |
| ---------- | ----------------------------- |
| API Name   | Cancel an order               |
| Group      | Order                         |
| Method     | DELETE                        |
| Path       | `/open/v1/order/{id}`         |
| Full URL   | `{{host}}/open/v1/order/{id}` |
| Encoding   | utf-8                         |
| Status     | Published                     |
| Updated At | 2025-12-10 16:21:54           |

### Description

取消未确认或未付款等状态的订单。其他状态可能不可取消。

This endpoint cancels an order if it is still unconfirmed or unpaid. Orders in later states may not be cancellable.

### Auth

| Field         | Value                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Auth Required | LIKELY YES                                                                                                                  |
| Auth Header   | `Authorization: Bearer <token>`                                                                                             |
| Token Source  | `/open/v1/accessToken`                                                                                                      |
| Notes         | Header was not included in the pasted content, but Order business APIs should require authorization. Verify during testing. |

### Path Parameters

| Name | Required | Type       | Description       |
| ---- | -------: | ---------- | ----------------- |
| `id` |      yes | int/string | Supplier order ID |

### Request Example

```bash
curl -sS -X DELETE "$S2BDIY_BASE_URL/open/v1/order/$SUPPLIER_ORDER_ID" \
  -H "Authorization: Bearer $S2BDIY_ACCESS_TOKEN" | jq .
```

### Success Response Example

```json
{
  "data": [
    {
      "id": 925,
      "status": 7
    }
  ],
  "msg": "操作成功",
  "status": "success",
  "status_code": 200,
  "time": 1
}
```

### Success Response Fields

| Field           | Type   | Description                          |
| --------------- | ------ | ------------------------------------ |
| `data[].id`     | int    | Supplier order ID                    |
| `data[].status` | int    | Order status. `7=已取消`                |
| `msg`           | string | Response message                     |
| `status`        | string | Response status, expected `success`  |
| `status_code`   | int    | Business status code, expected `200` |
| `time`          | int    | Response time                        |

### Error Response

```text
TODO_FROM_EOLINK_ERROR_CODE_PAGE
```

Need to verify error behavior for:

1. Missing token.
2. Invalid token.
3. Invalid order ID.
4. Order already paid.
5. Order already in production.
6. Order already shipped.
7. Order already cancelled.
8. Order belonging to another account.

### Dry-run Safety

| Check                                | Value       |
| ------------------------------------ | ----------- |
| Creates supplier product?            | NO          |
| Creates supplier order?              | NO          |
| Mutates order state?                 | YES         |
| Charges money?                       | NO          |
| Safe for default no-payment dry-run? | CONDITIONAL |
| Can be repeated?                     | UNKNOWN     |

### Dry-run Usage

This endpoint may be useful to clean up a dry-run unpaid order, but it should only be called if:

```text
SUPPLIER_ALLOW_CANCEL_DRY_RUN_ORDER=true
order_pay_status is unpaid
order_status is unconfirmed or unpaid
human approved cleanup or script cleanup is explicitly enabled
```

By default, dry-run can skip cancellation and leave the unpaid test order for manual inspection.

### Validation Points

If cleanup testing is approved, verify:

1. Created unpaid order can be cancelled.
2. Response returns `status=7`.
3. `Get Order Detail` after cancellation shows cancelled status.
4. Paid order cannot be cancelled.
5. Shipped order cannot be cancelled.
6. Duplicate cancel behavior is clear.

### Fields Needed by Later Steps

```text
cancelled_supplier_order_id = data[].id
cancelled_supplier_order_status = data[].status
```

### Local Raw Response Save Path

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/cancel-order.json
```

### Mapping to CitiGoo Internal Fields

| Supplier Field  | CitiGoo Suggested Field          |
| --------------- | -------------------------------- |
| `data[].id`     | `supplier_order_id`              |
| `data[].status` | `supplier_order_status`          |
| full response   | `supplier_cancel_order_raw_json` |

### Implementation Notes for Codex

* Do not call this endpoint by default unless dry-run cleanup is explicitly enabled.
* It mutates supplier order state.
* It may be safer to leave unpaid test orders for manual review during first integration testing.
* If used, only cancel orders created by the current dry-run using unique `third_order_id`.
* Never cancel unrelated supplier orders.
* Mask `Authorization` token in logs.
* Treat non-`status=success` or non-`status_code=200` as failure.
