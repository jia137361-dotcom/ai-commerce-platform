# POD 产品阶梯定价公式实现记录

**日期**: 2026-07-06
**分支**: feat/platform-marketplace-20260705

---

## 1. 需求背景

单店网站上 POD 产品的销售价需要基于供应商采购价（CNY）动态计算：

- **公式**: `零售价USD = 供应商CNY价格 / 汇率 × 阶梯倍率`
- **汇率**: USD/CNY = 1:6.77（环境变量配置，定期更新）
- **阶梯倍率**: 2.3x ~ 3x，按价格阶梯浮动
  - 低价商品高倍率（CNY 20 → 3x）
  - 高价商品低倍率（CNY 40 → 2.3x）
  - 中间线性插值
- **运费**: `供应商运费CNY / 6.77 × 1.02`（加 2% margin）

## 2. 阶梯倍率公式

```
usd_base = cny_price / 6.77
threshold_low = 20 / 6.77 = 2.95 USD
threshold_high = 40 / 6.77 = 5.91 USD

if usd_base <= 2.95:  markup = 3.0
if usd_base >= 5.91:  markup = 2.3
else:                 markup = 3.0 - (usd_base - 2.95) / (5.91 - 2.95) × 0.7
```

### 验证示例

| CNY 价格 | USD 基础价 | 倍率 | 零售价 USD |
|----------|-----------|------|-----------|
| 20 | 2.95 | 3.0x | $8.86 |
| 25 | 3.69 | 2.74x | $10.11 |
| 30 | 4.43 | 2.65x | $11.74 |
| 35 | 5.17 | 2.48x | $12.82 |
| 40 | 5.91 | 2.3x | $13.59 |

## 3. 实现改动

### 3.1 AI Worker 配置 (`apps/ai-worker/app/config.py`)

新增 3 个环境变量配置：

```python
usd_cny_rate: float = Field(default=6.77, validation_alias="AI_WORKER_USD_CNY_RATE")
price_markup_min: float = Field(default=2.3, validation_alias="AI_WORKER_PRICE_MARKUP_MIN")
price_markup_max: float = Field(default=3.0, validation_alias="AI_WORKER_PRICE_MARKUP_MAX")
```

### 3.2 阶梯倍率函数 (`apps/ai-worker/app/services/copy_generator.py`)

```python
def _calculate_tiered_markup(cny_price: float, rate: float, markup_min: float, markup_max: float) -> float:
    """阶梯倍率：低价高倍率(3x)，高价低倍率(2.3x)，中间线性插值"""
    usd_base = cny_price / rate
    threshold_low = 20.0 / rate
    threshold_high = 40.0 / rate
    if usd_base <= threshold_low:
        return markup_max
    if usd_base >= threshold_high:
        return markup_min
    t = (usd_base - threshold_low) / (threshold_high - threshold_low)
    return round(markup_max - t * (markup_max - markup_min), 2)
```

### 3.3 Mock 定价逻辑更新

**之前**: `price = max(base_cost * 2.5, base_cost + 5)` (base_cost 当作 USD)

**之后**:
```python
markup = _calculate_tiered_markup(base_cost, rate, min, max)
price = (base_cost / rate) * markup  # base_cost 是 CNY
```

### 3.4 后端共享定价工具 (`apps/medusa-backend/src/lib/pricing.ts`)

**新增文件**，提供 TypeScript 版本的相同逻辑：

```typescript
export function calculateTieredMarkup(cnyPrice: number): number
export function calculateRetailPriceUsd(cnyPrice: number): number
export function convertCnyToUsd(cnyAmount: number): number
export function convertShippingCnyToUsdWithMargin(cnyAmount: number, marginPercent = 2): number
```

### 3.5 手动草稿创建 (`create-draft/route.ts`)

**之前**: `price: Number(sp.purchase_price) || 29.99` (直接用 CNY 作为售价)

**之后**:
```typescript
const purchasePriceCny = Number(sp.purchase_price) || 0
const retailPriceUsd = purchasePriceCny > 0 ? calculateRetailPriceUsd(purchasePriceCny) : 29.99
```

### 3.6 AI 生成路径 (`generate-and-create-draft.ts`)

- `cost` 字段从 CNY 转换为 USD（之前直接存 CNY 值）
- `price` 字段由 AI Worker 返回的 `price_suggestion`（已是 USD）

### 3.7 Mock fallback base_cost (`generate_product.py`)

从 `8.5`（USD）改为 `25`（CNY），与实际供应商价格单位一致。

## 4. 环境变量

```bash
# .env.example 新增
AI_WORKER_USD_CNY_RATE=6.77
AI_WORKER_PRICE_MARKUP_MIN=2.3
AI_WORKER_PRICE_MARKUP_MAX=3.0
```

汇率更新方式：修改 `.env` 文件中的 `AI_WORKER_USD_CNY_RATE`，重启 AI Worker。

## 5. 数据流

```
S2BDIY API (CNY)
  ↓ sync
mc_supplier_product.purchase_price (CNY)
mc_supplier_product.base_cost (CNY)
  ↓ AI Worker
base_cost (CNY) → / rate → × tiered_markup → price_suggestion (USD)
  ↓ generate-and-create-draft.ts
mc_product.price (USD) ← price_suggestion
mc_product.cost (USD) ← base_cost / rate
```

## 6. 待办

- [ ] 运费 2% margin 的具体实现（需在 push-s2b-order.ts 中处理）
- [ ] 单元测试阶梯倍率函数
- [ ] 实际环境部署后验证定价输出
