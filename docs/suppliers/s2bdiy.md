# S2BDIY Open API 对接

## 环境

| 环境 | Base URL |
|------|----------|
| 测试 | `https://opentest.s2bdiy.com` |
| 生产 | `https://openapi.s2bdiy.com` |

测试体验密钥（文档概览）：

- `app_key`: `wm001`
- `app_secret`: `7b55d8cf04caf3db9232c98eadeb9cc2`

## 配置（`apps/medusa-backend/.env`）

见 [`.env.example`](../../apps/medusa-backend/.env.example) 中 `S2BDIY_*` 段落。

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

| CitiGoo（Dev1 命名；开发二写入 `mc_product.metadata` 直至列迁移） | S2BDIY |
|---------|--------|
| `metadata.supplier_material_id` | uploadMaterial `id` |
| `metadata.supplier_product_id`（非 `sp_*` 目录 id） | quickCreate `product_id` |
| `mockup_image_url` / `metadata.mockup_image_url` | product detail `show_images` |
| `metadata.basic_product_id` | basicProduct `id` |
| `mc_supplier_order.supplier_order_id` | order `id` |
| `mc_supplier_order.third_order_id` | Medusa `order_id`（勿重复提交） |

## Admin API（开发二 / 履约）

- `GET /admin/orders/{order_id}/supplier-order`
- `POST /admin/orders/{order_id}/retry-supplier-pay`
- `POST /admin/supplier-orders/sync`

## 测试脚本

```bash
bash scripts/s2bdiy-api-smoke.sh
bash scripts/phase2b-e2e.sh
```

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
