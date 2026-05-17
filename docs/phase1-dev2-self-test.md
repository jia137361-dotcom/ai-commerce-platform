# Phase 1 完整交易闭环自测（Dev2）

**目标**

1. `default_store` 能走通：**cart → 加购 → complete → order → fulfillment**
2. `test_store` 与 `default_store` **严格隔离**（不能跨店加商品、不能跨店读车）

**前提**

| 项 | 说明 |
|----|------|
| Docker | `ai-commerce-postgres`、`ai-commerce-redis` 为 Up |
| 后端 | 在 `apps/medusa-backend` 执行 `npm run dev`（默认 `http://localhost:9000`） |
| 分支 | 已合并 `develop`（含 `product-cart-bridge`：`medusa_variant_id` 等） |
| 迁移 | 在 `apps/medusa-backend` 执行 `npx medusa db:migrate`（含 `Migration20260516000100`） |
| Publishable Key | 请求头 `x-publishable-api-key`（Store API 必填） |
| 测试数据 | 见下方「准备测试数据」 |

**通用请求头**

```http
x-publishable-api-key: <PUBLISHABLE_API_KEY>
X-Store-Id: default_store   # 或 test_store
Content-Type: application/json
```

> 说明：自定义 `POST /store/carts` 成功时响应含 `metadata.store_id`。加购请使用 **`variant_id`**（须已关联 `mc_product.medusa_variant_id`）。

---

## 准备测试数据

1. **Store 与平台种子**（若无 `mc_store`）：

```bash
cd apps/medusa-backend
DATABASE_URL=postgres://medusa:medusa@localhost:5433/ai_commerce \
REDIS_URL=redis://localhost:6379 \
npm run seed
```

2. **桥接商品 + 原生 Medusa variant**（推荐，需**先停掉** `npm run dev` 再执行，避免数据库连接池占满）：

```bash
cd apps/medusa-backend
DATABASE_URL=postgres://medusa:medusa@localhost:5433/ai_commerce \
REDIS_URL=redis://localhost:6379 \
npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts
```

脚本会输出 `default_store` / `test_store` 的 `medusa_variant_id`，记为 `VARIANT_DEFAULT`、`VARIANT_TEST`。

3. **Admin Token**（可选，用于推履约 / mock 物流）：

```bash
curl -sS -X POST "http://localhost:9000/auth/user/emailpass" \
  -H "Content-Type: application/json" \
  -d '{"email":"<你的管理员邮箱>","password":"<密码>"}'
# 导出 ADMIN_TOKEN=<返回的 token>
```

4. **一键跑测并写结果**（需已 bootstrap 出 variant）：

```bash
export PUBLISHABLE_API_KEY="<pk_...>"
export ADMIN_TOKEN="<可选>"
bash scripts/phase1-dev2-self-test.sh
# 结果：docs/phase1-dev2-self-test-results.md
```

---

## 步骤 1：获取测试商品

```bash
curl -s "http://localhost:9000/store/products" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" | jq .

curl -s "http://localhost:9000/store/products" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: test_store" | jq .
```

**预期**

- 各自 `store_id` 与头一致
- 至少一条 `is_cart_addable: true` 且 `medusa_variant_id` 非空
- 记录：`VARIANT_DEFAULT`、`VARIANT_TEST`

---

## 步骤 2：创建购物车

```bash
curl -s -X POST "http://localhost:9000/store/carts" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" \
  -d '{
    "currency_code": "usd",
    "region_id": "<REGION_ID>"
  }' | jq .
```

`REGION_ID` 可从 bootstrap 输出或 `GET /store/regions`（需 publishable key）获取。

**预期**：HTTP 200，`cart_id` 存在，`metadata.store_id` 为 `default_store`。

---

## 步骤 3：加购与跨店隔离

### 3.1 同店加购（必须成功）

```bash
curl -s -X POST "http://localhost:9000/store/carts/<CART_ID>/line-items" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" \
  -d '{
    "variant_id": "<VARIANT_DEFAULT>",
    "quantity": 1
  }' | jq .
```

**预期**：HTTP 200，返回 `line_item`。

### 3.2 跨店加购（必须失败）

```bash
curl -s -X POST "http://localhost:9000/store/carts/<CART_ID>/line-items" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" \
  -d '{
    "variant_id": "<VARIANT_TEST>",
    "quantity": 1
  }' | jq .
```

**预期**：HTTP 400，`error.code` 为 **`CART_STORE_MISMATCH`**。

> 加购 body 使用 **`variant_id`**。若使用 `product_id`，可能命中 Medusa 内置路由而非本仓库自定义路由。

---

## 步骤 4–5：结账与订单

本仓库使用自定义 **`POST /store/carts/{id}/complete`**（非清单中的 `payment-sessions` 分步路径）。

```bash
curl -s -X POST "http://localhost:9000/store/carts/<CART_ID>/complete" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" \
  -d '{"payment_provider_id": "pp_system_default"}' | jq .
```

**预期**

- HTTP 200，`order_id` 存在
- `payment_status`: `paid`（`pp_system_default` 会在 complete 后标记）
- `fulfillment_status`: `waiting`

买家查单（需订单邮箱与 `display_id`）：

```bash
curl -s "http://localhost:9000/store/orders/lookup?email=<EMAIL>&display_id=<DISPLAY_ID>" \
  -H "x-publishable-api-key: <PUBLISHABLE_API_KEY>" \
  -H "X-Store-Id: default_store" | jq .
```

---

## 步骤 6：履约（Admin）

```bash
# 推履约（要求 payment_status === paid）
curl -s -X POST "http://localhost:9000/admin/orders/<ORDER_ID>/push-fulfillment" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-Store-Id: default_store" | jq .

# Mock 物流
curl -s -X POST "http://localhost:9000/admin/orders/<ORDER_ID>/mock-shipment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-Store-Id: default_store" \
  -d '{"carrier":"mock","tracking_number":"MOCK-001","tracking_url":"https://example.com/track/MOCK-001"}' | jq .
```

**预期**：`fulfillment_status` 依次为 `pushed`、`shipped`；`GET /store/orders/{id}/tracking?email=` 可查到物流。

---

## 步骤 7：Store 隔离交叉验证

| 用例 | 操作 | 预期 |
|------|------|------|
| A | `test_store` 车 + `VARIANT_TEST` | 200 |
| B | `test_store` 车 + `VARIANT_DEFAULT` | 400 `CART_STORE_MISMATCH` |
| C | `test_store` 头读 `default_store` 的 `CART_ID` | 403 `CART_STORE_ACCESS_DENIED` |
| D | 两店各自 complete，订单 `metadata.store_id` 不串店 | 各自仅本店 lookup 可查 |

---

## 测试通过 Checklist

- [ ] `GET /health` → 200
- [ ] 两店 `GET /store/products` 各有 `is_cart_addable` 商品
- [ ] `POST /store/carts` → `metadata.store_id` 正确
- [ ] 同店 `POST .../line-items` → 200
- [ ] 跨店 `POST .../line-items` → 400 `CART_STORE_MISMATCH`
- [ ] 跨店 `GET /store/carts/{id}` → 403 `CART_STORE_ACCESS_DENIED`
- [ ] `POST .../complete` → 200，`payment_status=paid`，`fulfillment_status=waiting`
- [ ] Admin push-fulfillment + mock-shipment（可选）
- [ ] `GET /store/orders/lookup` / `tracking`（可选）

---

## 实测记录

见 **[phase1-dev2-self-test-results.md](./phase1-dev2-self-test-results.md)**（含本次环境命令输出与通过/未通过项）。
