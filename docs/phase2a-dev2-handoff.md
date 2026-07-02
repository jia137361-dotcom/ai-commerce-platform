# Phase 2A Dev2 交接与验收

## 前置

| 项 | 说明 |
|----|------|
| Docker | Postgres + Redis 已启动 |
| 环境 | 仅维护 [`apps/medusa-backend/.env`](../apps/medusa-backend/.env) |
| Python | **3.13**，venv 目录名 **`citigooapi`**（见 [`apps/ai-worker/README.md`](../apps/ai-worker/README.md)） |
| 桥接 | `npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts` 后把输出的 `medusa_variant_id` 写入 `.env` 的 `DEFAULT_MEDUSA_VARIANT_ID` |

## 1. 迁移与种子

```bash
cd apps/medusa-backend
npx medusa db:migrate
npm run seed
npm run build
```

## 2. Supplier + design template

```bash
curl -s "http://localhost:9000/store/supplier-products?platform_product_id=pp_tshirt" \
  -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" \
  -H "X-Store-Id: default_store" | jq '.supplier_products[0] | {
    supplier_product_id: .id,
    variant: .variants[0].id,
    print_spec: .print_specs[0].id,
    design_template: .design_templates[0].id
  }'
```

期望：`sp_tshirt`、`spv_tshirt_black_m`、`sps_tshirt_front_png`、`pdt_tshirt_front`。

## 3. 启动服务（两个终端）

**Medusa**

```bash
cd apps/medusa-backend && npm run dev
```

**AI Worker**

```bash
cd apps/ai-worker
python3.13 -m venv citigooapi
source citigooapi/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## 4. 单元测试

```bash
cd apps/ai-worker && source citigooapi/bin/activate
AI_WORKER_MOCK_GENERATION=true pytest -q

cd apps/medusa-backend && npm test
```

## 5. E2E 脚本（仓库根目录）

```bash
cd /path/to/ai-commerce-platform
bash scripts/phase2a-dev2-e2e.sh
```

- 必填：`ADMIN_TOKEN`
- 完整链路（publish + 加购 + 可选 complete）：`PUBLISHABLE_API_KEY`、`DEFAULT_MEDUSA_VARIANT_ID`（bootstrap 输出）

## 6. 手工 API（可选）

```bash
curl -sS -X POST http://localhost:8001/ai/generate-product \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test cat","platform_product_id":"pp_tshirt","supplier_product_id":"sp_tshirt","supplier_variant_id":"spv_tshirt_black_m"}' | jq .

curl -sS -X POST http://localhost:9000/admin/ai/generate-and-draft \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: default_store" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test cat","platform_product_id":"pp_tshirt","supplier_product_id":"sp_tshirt","supplier_variant_id":"spv_tshirt_black_m","medusa_variant_id":"'"$DEFAULT_MEDUSA_VARIANT_ID"'"}' | jq .
```

## 验收清单

- [ ] Worker 返回 `design_image_url`、`print_file_url`（PNG）、`mockup_image_url`、文案与 `price_suggestion`
- [ ] Medusa 创建 `mc_product` draft（`POST /admin/ai/generate-and-draft`）
- [ ] publish + 加购后 line item `metadata` 含 supplier_*、print_file_url、print_position、color、size
- [ ] complete 后 `fulfillment_order.payload.line_items` 含上述 metadata（Phase1 脚本或 e2e 步骤 6）
- [ ] Phase1 回归：`bash scripts/phase1-dev2-self-test.sh`

## 已知限制

- 每个 AI 品与 Phase1 桥接可共用同一 `medusa_variant_id`；加购时优先绑定 **已发布且 source=ai 的最新** `mc_product`。
- 真实 Stripe、真实供应商推单为后续阶段；本地默认 `pp_system_default`。
- Print 文件当前导出为 **PNG**（非 JPG）。
