# S2BDIY Open API 对接

## 环境

| 环境 | Base URL |
|------|----------|
| 测试 | `https://opentest.s2bdiy.com` |
| 生产 | `https://openapi.s2bdiy.com` |

测试环境凭据：

- `app_key`: `wm001`
- `app_secret`: use the current sandbox secret from the supplier console or private handoff.

Do not commit real S2BDIY credentials. Keep them only in `apps/medusa-backend/.env` or your local shell.

## 配置（`apps/medusa-backend/.env`）

见 [`.env.example`](../../apps/medusa-backend/.env.example) 中 `S2BDIY_*` 段落。

常用本地变量：

| 变量 | 用途 |
|------|------|
| `S2BDIY_API_BASE_URL` | S2BDIY Open API base URL, usually `https://opentest.s2bdiy.com` for sandbox. |
| `S2BDIY_APP_KEY` | Supplier sandbox app key. |
| `S2BDIY_APP_SECRET` | Supplier sandbox app secret. Required for real S2BDIY smoke. |
| `S2BDIY_PLATFORM_ID` | S2BDIY platform id. Local default is `99`. |
| `S2BDIY_TEST_BASIC_PRODUCT_ID` | Basic product id used by sync/smoke. |
| `S2BDIY_TEST_COLOR_ID` | Test color id used for quickCreate/order payloads. |
| `S2BDIY_TEST_SIZE_ID` | Test size id used for quickCreate/order payloads. |
| `S2BDIY_TEST_VIEW_ID` | Test print view id. |
| `S2BDIY_STORE_ID` | S2BDIY platform store id, not CitiGoo `default_store`. |
| `S2BDIY_TEST_LOGISTICS_ID` | Optional fallback logistics id when logisticsCalculation cannot select one. |
| `S2BDIY_TEST_PRINT_FILE` | Optional local print file path; defaults to `scripts/test-assets/test-print.png`. |
| `S2BDIY_DEFAULT_WEIGHT` / `LENGTH` / `WIDTH` / `HEIGHT` | Package dimensions for logistics calculation. Weight is in grams for current smoke scripts. |

Mock vs real behavior:

- Unit tests and shell syntax checks do not require real S2BDIY credentials.
- `scripts/phase2b-e2e.sh` skips supplier sync when `S2BDIY_API_BASE_URL` is not configured, then runs the Phase 2A baseline.
- `scripts/s2bdiy-api-smoke.sh` calls the real S2BDIY sandbox and requires `S2BDIY_APP_SECRET`.
- `orderPay` requires a supplier sandbox account with prepaid test balance. HTTP 502 from `orderPay` is often an external account-balance issue, not automatically a CitiGoo regression.

## 调用顺序

1. `POST /open/v1/accessToken` → Bearer token（3 天有效）
2. `GET /open/v1/basicProduct` / `{id}` → 选品、颜色、尺码、印刷面
3. `POST /open/v1/material/uploadMaterial` → `material_id`
4. `POST /open/v1/product/quickCreate` → `product_id`（长期可复用下单）
5. `GET /open/v1/product/{id}` → 供应商效果图
6. `GET /open/v1/logisticsCalculation` → `logistics_platform_id`
7. `POST /open/v1/order` → 供应商订单号
8. `POST /open/v1/orderPay` → 预充值扣款（余额不足 HTTP 502，可重试）
9. `GET /open/v1/order/{id}` → 轮询状态/物流（无 webhook）

## CitiGoo 字段映射

| CitiGoo | S2BDIY |
|---------|--------|
| `mc_product.s2b_material_id` | uploadMaterial `id` |
| `mc_product.s2b_designed_product_id` | quickCreate `product_id` |
| `mc_product.s2b_mockup_image_url` | product detail `show_images` |
| `mc_supplier_product.basic_product_id` | basicProduct `id` |
| `mc_supplier_order.supplier_order_id` | order `id` |
| `mc_supplier_order.third_order_id` | Medusa `order_id`（勿重复提交） |

## Admin API

- `POST /admin/suppliers/s2bdiy/sync-basic-product`
- `GET /admin/orders/{order_id}/supplier-order`
- `POST /admin/orders/{order_id}/retry-supplier-pay`
- `POST /admin/supplier-orders/sync`

Admin routes require:

- `Authorization: Bearer <ADMIN_TOKEN>`
- `X-Store-Id: <store_id>` where the route checks order/store ownership

Route behavior:

- `POST /admin/suppliers/s2bdiy/sync-basic-product` imports a S2BDIY basic product into supplier product, variant, and print-spec tables. It requires `basic_product_id` in the body or `S2BDIY_TEST_BASIC_PRODUCT_ID`.
- `GET /admin/orders/{order_id}/supplier-order` returns local supplier order rows and supplier order items for a store-owned order.
- `POST /admin/orders/{order_id}/retry-supplier-pay` retries `orderPay` for an existing supplier order and returns `status: "pay_retried"` when accepted.
- `POST /admin/supplier-orders/sync` polls pending supplier orders and updates local supplier/payment/tracking status.

## 状态映射

Current internal supplier order statuses:

- `not_pushed`
- `created`
- `payment_pending`
- `paid`
- `reviewing`
- `queued`
- `in_production`
- `shipped`
- `cancelled`
- `failed`

Current payment statuses:

- `payment_pending`
- `paying`
- `paid`
- `pay_failed`

When S2BDIY order detail includes tracking, sync writes tracking fields to `mc_supplier_order` and, for shipped orders, updates fulfillment/shipment records where matching local fulfillment rows exist.

## 测试脚本

```bash
bash scripts/s2bdiy-api-smoke.sh
bash scripts/s2bdiy-error-cases.sh
bash scripts/phase2b-e2e.sh
```

Coverage:

- `scripts/s2bdiy-api-smoke.sh`: token, basic product list/detail, uploadMaterial, quickCreate, product detail, logisticsCalculation, store lookup, create order, orderPay, order detail.
- `scripts/s2bdiy-error-cases.sh`: duplicate `third_order_id` guidance and invalid-token response.
- `scripts/phase2b-e2e.sh`: Medusa admin sync route, Phase 2A baseline, and supplier order sync route when S2BDIY config is present.

## 跑通 smoke 第 8–10 步（下单 / 支付 / 查单）

### 前置

1. `source apps/medusa-backend/.env`（含 `S2BDIY_*`）
2. `.env` 中 `S2BDIY_DEFAULT_WEIGHT` 使用**克**（如 `225`），不要用 `0.3`
3. 配置 **`S2BDIY_STORE_ID`**：S2B 平台店铺 id（不是你的 `default_store`）
   ```bash
   curl -sS -H "Authorization: Bearer $S2B_TOKEN" \
     "${S2BDIY_API_BASE_URL%/}/open/v1/store?page=1" | jq '.data.data[0].id'
   ```
4. 测试账户需有**预充值余额**（见下）

### 一键跑全流程

```bash
cd /path/to/ai-commerce-platform
set -a && source apps/medusa-backend/.env && set +a
bash scripts/s2bdiy-api-smoke.sh
```

成功时步骤 8–10 会输出 `order_id`，并完成 `orderPay`、订单详情查询。

### orderPay 返回 HTTP 502

表示**测试环境账户余额不足**。处理方式：

1. 登录 S2B **测试环境**网页后台（与 `opentest.s2bdiy.com` 对应的开户站点，用 `wm001` 绑定账号或联系技术开通）
2. 在「账户 / 充值 / 预充值」中充值测试额度
3. 或在对接群联系 **小定 / 陈任翔**，说明 `app_key: wm001` 需要测试充值
4. 充值后重跑 smoke，或单独重试支付（已有订单号时）：

```bash
curl -sS -X POST "${S2BDIY_API_BASE_URL%/}/open/v1/orderPay" \
  -H "Authorization: Bearer $S2B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ids\":[<供应商订单号>]}"
```

Medusa 侧也可：`POST /admin/orders/{order_id}/retry-supplier-pay`（需 `ADMIN_TOKEN`）。

### 常见异常场景

- Token expired / invalid token: rerun accessToken or verify `S2BDIY_APP_KEY` / `S2BDIY_APP_SECRET`.
- Material upload failed: verify the print file exists, is readable, and matches accepted image constraints.
- quickCreate failed: verify `basic_product_id`, `size_id`, `color_id`, `view_id`, and uploaded `material_id`.
- Product detail has no image: check `show_images` in the S2BDIY product detail response before publishing.
- Missing logistics id: set `S2BDIY_TEST_LOGISTICS_ID` or adjust destination/package dimensions.
- Create order failed: check duplicate `third_order_id`, store id, address, and item ids.
- orderPay failed: check supplier order id and sandbox prepaid balance.
- Order detail polling failed: verify supplier order id and token.
- Tracking is empty: keep polling; tracking may appear only after supplier production/shipment advances.

### 手工 curl 第 8–10 步（调试用）

在 smoke 1–6 步已有 `PRODUCT_ID`、`LOGISTICS_ID` 后：

```bash
THIRD="manual-$(date +%s)"
# 8 创建订单
curl -sS -X POST "${S2BDIY_API_BASE_URL%/}/open/v1/order" \
  -H "Authorization: Bearer $S2B_TOKEN" -H "Content-Type: application/json" \
  -d "{\"third_order_id\":\"$THIRD\",\"platform\":99,\"logistics_id\":150,\"country\":\"US\",\"postcode\":\"10001\",\"name\":\"Test\",\"phone\":\"123\",\"items\":[{\"product_id\":<PRODUCT_ID>,\"size_id\":20,\"color_id\":6,\"num\":1}]}"

# 9 支付（ids 为返回的供应商订单 id）
curl -sS -X POST "${S2BDIY_API_BASE_URL%/}/open/v1/orderPay" \
  -H "Authorization: Bearer $S2B_TOKEN" -H "Content-Type: application/json" \
  -d '{"ids":[<ORDER_ID>]}'

# 10 查单
curl -sS -H "Authorization: Bearer $S2B_TOKEN" \
  "${S2BDIY_API_BASE_URL%/}/open/v1/order/<ORDER_ID>"
```
