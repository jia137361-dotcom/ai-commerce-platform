# CitiGoo 单店前端 PRD（含 Part 4 素材路径）

## 1. 项目概述

**目标：** 完成 Phase 2A + 2B 单店 MVP 的全部前端页面

**素材来源：**

| 来源 | 覆盖范围 | 形态 | 位置 |
|------|---------|------|------|
| Part 4 设计稿 | 买家端移动 UI（PSD+PNG） | 设计源文件 | `C:\py文档\part 4\` |
| citigoo.com | 买家端 PC+移动（Next.js） | 上线代码 | `https://www.citigoo.com` |
| 卖家 AI 端 | **两个来源都没有** | **需全新设计** | — |

---

## 2. 完整页面清单

```
卖家端 (Seller Dashboard) — 全部 🆕 全新设计
├── AI 产品生成页
├── AI 生成结果/进度页
├── 产品草稿编辑页
├── 产品管理列表页
├── 订单管理页
├── 履约追踪页
└── 店铺设置页（可参考 part 4 Settings）

买家端 (Buyer Storefront) — ✅ 有素材可复用
├── 首页
├── 商品详情页
├── 购物车页
├── 结算/支付页
├── 订单查询页
├── 物流追踪页  ← 🆕 需新设计
├── 登录/注册页
└── 辅助页（帮助中心/关于/条款等）
```

---

## 3. 🆕 AI 功能页面（全新设计，无 Part 4 素材）

> 以下 7 个页面在 part 4 和 citigoo.com 中**均无对应素材**，需要美工从零设计。

### 3.1 AI 产品生成页

**路由：** `/admin/ai-generate`

**页面布局：**

```
┌──────────────────────────────────────┐
│  ← Back to Dashboard                 │
├──────────────────────────────────────┤
│  Create Product with AI              │
│  ──────────────────────────────────  │
│                                      │
│  What do you want to create?         │
│  ┌──────────────────────────────────┐│
│  │ Describe your design idea...     ││
│  │ e.g. "A retro sunset graphic    ││
│  │ with palm trees for summer vibe" ││
│  └──────────────────────────────────┘│
│                                      │
│  Select Product Type                 │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Tshirt│ │Hoodie│ │ Mug  │  ...   │
│  │  ○   │ │  ○   │ │  ○   │        │
│  └──────┘ └──────┘ └──────┘        │
│                                      │
│  Variant (optional)                  │
│  Color: [Black ▾]  Size: [L ▾]      │
│                                      │
│  ┌──────────────────────────────────┐│
│  │       Generate with AI →         ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**交互状态：**
- 默认：空 prompt + 未选产品 → 按钮 disabled（灰色）
- 已填写：prompt 有内容 + 已选产品 → 按钮 active（橙色 `#F97316`）
- 生成中：按钮显示 loading spinner + "Generating..."
- PC 端：左右两栏（左 prompt，右产品选择）
- 移动端：单栏纵向排列

**参考：** Midjourney / Canva AI 的 prompt 输入交互。无 part 4 素材。

---

### 3.2 AI 生成进度/结果页

**路由：** `/admin/ai-generate/[jobId]`

**生成中状态：**

```
┌──────────────────────────────────────┐
│  AI Generation                       │
├──────────────────────────────────────┤
│       ┌──────────────────────┐       │
│       │    ⏳ Generating...   │       │
│       │                      │       │
│       │   current_step:      │       │
│       │   "Creating design"  │       │
│       │                      │       │
│       │  ████████░░░░  60%   │       │
│       └──────────────────────┘       │
│                                      │
│  Your prompt: "retro sunset..."      │
│  Product: T-shirt                   │
└──────────────────────────────────────┘
```

**生成完成状态：**

```
┌──────────────────────────────────────┐
│  AI Generation Complete ✓            │
├──────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐          │
│  │ Design  │  │ Mockup  │          │
│  │  Image  │  │  Image  │          │
│  └─────────┘  └─────────┘          │
│                                      │
│  Title                               │
│  ┌──────────────────────────────────┐│
│  │ Retro Sunset Summer T-Shirt     ││
│  └──────────────────────────────────┘│
│                                      │
│  Description                         │
│  ┌──────────────────────────────────┐│
│  │ This retro sunset design...      ││
│  └──────────────────────────────────┘│
│                                      │
│  Tags: [summer] [retro] [sunset]    │
│                                      │
│  AI Suggested Price: $29.99          │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │ Regenerate│  │Save Draft│         │
│  └──────────┘  └──────────┘         │
└──────────────────────────────────────┘
```

**四种状态：**

| 状态 | 显示内容 |
|------|---------|
| `pending` | "Waiting in queue..." + 骨架屏 |
| `running` | 进度条 + current_step 文字 + 动画 |
| `completed` | AI 输出（图片 + 文字全展示） |
| `failed` | 错误信息 + "Retry" 按钮 |

**参考：** RunwayML / DALL-E 生成等待页。进度条复用 citigoo.com 橙色主题。无 part 4 素材。

---

### 3.3 产品草稿编辑页

**路由：** `/admin/products/draft/[productId]`

```
┌──────────────────────────────────────┐
│  ← Back    Edit Draft    [Publish]   │
├──────────────────────────────────────┤
│  ┌────────────────────────────┐      │
│  │       Design Preview       │      │
│  │    (mockup on T-shirt)     │      │
│  └────────────────────────────┘      │
│                                      │
│  Title                    [✎ edit]  │
│  Retro Sunset Summer T-Shirt        │
│                                      │
│  Description              [✎ edit]  │
│  This retro sunset design features  │
│  warm palm tree silhouettes...      │
│                                      │
│  Price                    [✎ edit]  │
│  $ [29.99]                           │
│                                      │
│  Tags                     [✎ edit]  │
│  [summer ×] [retro ×] [sunset ×]    │
│  [+ Add tag]                         │
│                                      │
│  Variants                            │
│  Black  S/M/L/XL    $29.99          │
│  White  S/M/L/XL    $29.99          │
│                                      │
│  SEO                        [▼展开] │
│  Meta title / description           │
│                                      │
│  ┌──────────────────────────────────┐│
│  │  [Save as Draft]   [Publish]    ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**交互：**
- 点击 `[✎ edit]` → 字段变为可编辑 input
- 图片区点击可放大 / 重新下载 print file
- `Publish` → 产品状态改为 published，出现在 storefront
- PC 端：左图右表单，参考 Shopify 产品编辑页
- 移动端：单栏堆叠，图片固定顶部

**参考：** Shopify 产品编辑页布局。无 part 4 素材。

---

### 3.4 产品管理列表页

**路由：** `/admin/products`

```
┌──────────────────────────────────────┐
│  Products              [+ New with AI]│
├──────────────────────────────────────┤
│  [All] [Published] [Draft] [Failed]  │
├──────────────────────────────────────┤
│  ┌──────┬────────┬───────┬────────┐  │
│  │Image │ Title  │Status │Actions │  │
│  ├──────┼────────┼───────┼────────┤  │
│  │ 🖼️   │Retro.. │Published│ ⋯   │  │
│  │ 🖼️   │Cool..  │Draft  │ ⋯    │  │
│  │ 🖼️   │Fun..   │Failed │ ⋯    │  │
│  └──────┴────────┴───────┴────────┘  │
└──────────────────────────────────────┘
```

**状态标签颜色：** Published=绿色 / Draft=灰色 / Failed=红色

**无 part 4 素材。**

---

### 3.5 订单管理页（卖家端）

**路由：** `/admin/orders`

```
┌──────────────────────────────────────┐
│  Orders                              │
├──────────────────────────────────────┤
│  Order # | Status | Items | Total   │
│  ────────┼────────┼───────┼────────  │
│  #12345  │Paid   │ 2x   │ $59.98   │
│          │       │      │ [Details] │
└──────────────────────────────────────┘
```

**订单详情展开：**

| 信息 | 说明 |
|------|------|
| 商品列表 | 缩略图 + 名称 + 数量 + 单价 |
| 支付状态 | paid / pending / refunded |
| 履约状态 | waiting → pushed → in_production → shipped → delivered |
| 操作按钮 | `[Push to Fulfillment]` `[Mock Shipment]` |

**可参考的 part 4 素材（买家端订单列表，需改为卖家视角）：**
- `C:\py文档\part 4\Orders\CitigooPay-65-i2-2.png` — 订单列表
- `C:\py文档\part 4\Orders\CitigooPay-66-i2-2.png` — 订单详情
- `C:\py文档\part 4\Orders\CitigooPay-66-i2-3.png` — 订单详情（变体）
- `C:\py文档\part 4\Orders\CitigooPay-66-i2-4.png` — 订单状态
- `C:\py文档\part 4\Orders\CitigooPay-66-i2-5.png` — 订单状态
- `C:\py文档\part 4\Orders\CitigooPay-67-i2-2.png` — 订单物流
- `C:\py文档\part 4\Orders\CitigooPay-71-i2-2.png` — 订单追踪

---

### 3.6 履约追踪页（卖家端）

**路由：** `/admin/orders/[orderId]/fulfillment`

```
┌──────────────────────────────────────┐
│  Fulfillment - Order #12345          │
├──────────────────────────────────────┤
│  Supplier: PrintPro                  │
│  Supplier Order ID: SP-98765        │
│                                      │
│  ● Waiting                          │
│  │                                   │
│  ● Pushed to Supplier               │
│  │  2026-05-24 14:30                │
│  ○ In Production                    │
│  │                                   │
│  ○ Shipped                          │
│  │                                   │
│  ○ Delivered                        │
│                                      │
│  Tracking: ____________              │
│  Carrier: [FedEx ▾]                  │
│  ┌──────────────────────────────────┐│
│  │  [Push Fulfillment]              ││
│  │  [Mock Shipment]                 ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**无 part 4 素材。** 时间轴样式可参考主流电商物流追踪页。

---

### 3.7 店铺设置页

**路由：** `/admin/settings`

```
┌──────────────────────────────────────┐
│  Store Settings                      │
├──────────────────────────────────────┤
│  Logo:        [Upload]               │
│  Store Name:  [____________]         │
│  Support Email: [____________]       │
│  Currency:    [USD ▾]                │
│  Language:    [English ▾]            │
│  ┌──────────────────────────────────┐│
│  │  [Save Settings]                 ││
│  └──────────────────────────────────┘│
└──────────────────────────────────────┘
```

**Part 4 参考素材：**
- `C:\py文档\part 4\Settings\mobile_2_2_2.png` — 移动端设置页面布局
- `C:\py文档\part 4\Account & security\CitigooPay-137.png` — 账号安全
- `C:\py文档\part 4\Account & security\CitigooPay-138.png` — 账号安全
- `C:\py文档\part 4\Account & security\CitigooPay-139.png` — 账号安全
- `C:\py文档\part 4\Language\CitigooPay-152.png` — 语言选择
- `C:\py文档\part 4\Currency\CitigooPay-150.png` — 货币选择
- `C:\py文档\part 4\Country & region\CitigooPay-151-i2.png` — 国家/地区选择

---

## 4. 买家端页面设计（含 Part 4 素材路径）

### 4.1 首页

**素材来源：** citigoo.com 代码 + part 4 设计稿

| 组件 | 来源 | Part 4 具体位置 |
|------|------|----------------|
| 整体布局 | citigoo.com | — |
| 移动端首页（带店铺定位） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores Locals\快照1-5-3.png` |
| 移动端首页（带店铺定位变体） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores Locals\快照1-5-4.png` |
| 移动端首页（带店铺定位更多） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores Locals\快照1-5-5.png` `快照1-5-6.png` `快照1-5-7.png` |
| 移动端首页（纯店铺-有分类） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores only\Categories\快照1-5-4.png` `快照1-5-5.png` `快照1-5-5-1.png` |
| 移动端首页（纯店铺-主页） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores only\Homepage\快照1-5-3.png` |
| 移动端首页（纯店铺-筛选器） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores only\Filter\快照1-5-6-1.png` ~ `快照1-5-6-7.png` |
| 移动端首页（纯店铺-搜索） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores only\Search\快照1-5-6.png` |
| 移动端首页（纯店铺-导航栏） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\mobile version\With Stores only\Navigation bar\快照1-5-7.png` |
| PC 端首页（带店铺定位） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\pc version\With Stores Locals\快照2-2-1.png` |
| PC 端首页（纯店铺） | part 4 | `C:\py文档\part 4\Homepage_@ part 1\pc version\With Stores only\快照2-2-1.png` |
| 导航栏图标-首页 | part 4 | `C:\py文档\part 4\@icons Part 1\Home click.png` `C:\py文档\part 4\@icons Part 1\Home-click_1.png` `C:\py文档\part 4\@icons Part 1\home.png` |
| 导航栏图标-购物车 | part 4 | `C:\py文档\part 4\@icons Part 1\Shopping-cart-1.png` |
| 导航栏图标-个人 | part 4 | `C:\py文档\part 4\@icons Part 1\me.png` `C:\py文档\part 4\@icons Part 1\me click.png` `C:\py文档\part 4\@icons Part 1\me-click-1.png` |
| 定位图标 | part 4 | `C:\py文档\part 4\@icons Part 1\location-2952.png` |
| 搜索图标 | part 4 | `C:\py文档\part 4\@icons Part 1\search_grey_5.png` |
| 菜单图标 | part 4 | `C:\py文档\part 4\@icons Part 1\menu_lines_icon_128347.png` `C:\py文档\part 4\@icons Part 1\menu_lines_icon_128347-2.png` |
| 产品分类图标 | part 4 | `C:\py文档\part 4\Homepage_@ part 1\icons\add.png` |

**美工修改项：**
- 分类导航品类改为：`T-Shirt / Hoodie / Mug / Phone Case / Poster / Canvas`
- 筛选器删除 `TargetSpecies`，改为 `Size`（S/M/L/XL）
- citigoo.com Header 保持不变
- 促销横幅保留

---

### 4.2 商品详情页

**素材来源：** **以 part 4 为主**，citigoo.com 为辅

| 组件 | Part 4 具体位置 |
|------|----------------|
| **原价展示** | `C:\py文档\part 4\Product details@ part 2\Price Original\快照2-2-2.png` |
| **折扣价展示** | `C:\py文档\part 4\Product details@ part 2\Price After Discount\快照2-2-3.png` |
| **尺码指南弹窗** | `C:\py文档\part 4\Product details@ part 2\Pop-up size guide\快照2-2-5-2.png` `C:\py文档\part 4\Product details@ part 2\Pop-up size guide\快照2-2-5-3.png` |
| **商品描述弹窗** | `C:\py文档\part 4\Product details@ part 2\Pop-up details & description\快照2-2-5-1.png` `C:\py文档\part 4\Product details@ part 2\Pop-up details & description\快照2-2-5-1-2.png` |
| **物流政策弹窗** | `C:\py文档\part 4\Product details@ part 2\Pop-up shipping policy\快照2-2-2a2.png` |
| **国家/地区弹窗** | `C:\py文档\part 4\Product details@ part 2\Pop-up country & region\快照2-2-2a1.png` |
| **分享弹窗** | `C:\py文档\part 4\Product details@ part 2\Pop-up share\快照2-2-2-c2.png` |
| **评价列表** | `C:\py文档\part 4\Product details@ part 2\Item reviews\快照2-2-5-4.png` |
| **评论+推荐** | `C:\py文档\part 4\Product details@ part 2\Item Detail Comment  Recommend\快照2-2-4.png` `C:\py文档\part 4\Product details@ part 2\Item Detail Comment  Recommend\快照2-2-4-2.png` `C:\py文档\part 4\Product details@ part 2\Item Detail Comment  Recommend\快照2-2-4-3.png` `C:\py文档\part 4\Product details@ part 2\Item Detail Comment  Recommend\快照2-2-4-4.png` |
| **关注按钮** | `C:\py文档\part 4\Product details@ part 2\Following\快照2-2-2-d1.png` |
| **3 点菜单弹窗** | `C:\py文档\part 4\Pop-up ... 3 dot\快照2-2-2-c3-1.png` |
| **商品详情图标-购物车** | `C:\py文档\part 4\Product details@ part 2\icons\Shopping-cart-2-186.png` `C:\py文档\part 4\Product details@ part 2\icons\Shopping-cart-2-96.png` `C:\py文档\part 4\Product details@ part 2\icons\Shopping-cart-2-black-186.png` `C:\py文档\part 4\Product details@ part 2\icons\Shopping-cart-2-black-96.png` |
| **商品详情图标-收藏** | `C:\py文档\part 4\Product details@ part 2\icons\favorite_favourite_star_like_icon_131537.png` `C:\py文档\part 4\Product details@ part 2\icons\favorite_favourite_star_like_icon_131537-orange.png` `C:\py文档\part 4\Product details@ part 2\icons\favorite_favourite_star_like_icon_131537-orange-40.png` |
| **商品详情图标-分享** | `C:\py文档\part 4\Product details@ part 2\icons\share-white_ring-02-214.png` `C:\py文档\part 4\Product details@ part 2\icons\share-white_ring-02-214.psd` |
| **商品详情图标-搜索** | `C:\py文档\part 4\Product details@ part 2\icons\search-white_ring-256.png` `C:\py文档\part 4\Product details@ part 2\icons\search_grey_5_450.png` |
| **商品详情图标-返回箭头** | `C:\py文档\part 4\Product details@ part 2\icons\left-arrow-white_ring-492-black.png` `C:\py文档\part 4\Product details@ part 2\icons\left-arrow-white_ring-2-540.png` |
| **商品详情图标-物流** | `C:\py文档\part 4\Product details@ part 2\icons\transport-2-473-2.png` `C:\py文档\part 4\Product details@ part 2\icons\transport-2-40-2.png` |
| **商品详情图标-店铺** | `C:\py文档\part 4\Product details@ part 2\icons\Small_shop-2-orange-417.png` `C:\py文档\part 4\Product details@ part 2\icons\Small_shop-2-orange-42.png` |
| **商品详情图标-订单** | `C:\py文档\part 4\Product details@ part 2\icons\Order list.png` `C:\py文档\part 4\Product details@ part 2\icons\Order-list-2-128.png` `C:\py文档\part 4\Product details@ part 2\icons\Order-list-2-40.png` |

**美工修改项：**
- part 4 是移动端竖版设计，需适配为**响应式**（PC 端左图右信息布局）
- 颜色选择器改为 T-shirt 的 Black / White 二色
- 尺码表弹窗内容改为 S/M/L/XL 的测量数据表
- 物流政策弹窗内容改为独立站真实物流文案

---

### 4.3 购物车

**素材来源：** **完全以 part 4 为主**

| 组件 | Part 4 具体位置 |
|------|----------------|
| **加入购物车-主图** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-1.png` |
| **加入购物车-变体 2** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-2.png` |
| **加入购物车-变体 3** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-3.png` |
| **加入购物车-变体 4** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-4.png` |
| **加入购物车-变体 5** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-5.png` |
| **加入购物车-变体 6** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-6.png` |
| **加入购物车-变体 7** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-7.png` |
| **加入购物车-变体 8** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-8.png` |
| **加入购物车-变体 9** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-9.png` |
| **加入购物车-变体 10** | `C:\py文档\part 4\Cart\Add to cart\快照2-6-10.png` |
| **立即购买-1** | `C:\py文档\part 4\Cart\Buy now\快照2-7-1.png` |
| **立即购买-2** | `C:\py文档\part 4\Cart\Buy now\快照2-7-2.png` |
| **立即购买-3** | `C:\py文档\part 4\Cart\Buy now\快照2-7-3.png` |
| **立即购买-4** | `C:\py文档\part 4\Cart\Buy now\快照2-7-4.png` |
| **提交订单-1** | `C:\py文档\part 4\Cart\Submit order\快照2-8-1.png` |
| **提交订单-2** | `C:\py文档\part 4\Cart\Submit order\快照2-8-2.png` |
| **添加新卡** | `C:\py文档\part 4\Cart\Add a new card\快照2-8-3.png` |
| **编辑账单地址** | `C:\py文档\part 4\Cart\Edit billing address\快照2-8-3.png` |

**购物车页面布局：**

```
┌──────────────────────────────────────┐
│  Shopping Cart                       │
├──────────────────────────────────────┤
│  □ 商品1  $29.99 x1                  │  ← 参考 Add to cart 系列
│  □ 商品2  $19.99 x2                  │
├──────────────────────────────────────┤
│  Subtotal:  $69.97                   │
│  Shipping:   $5.00                   │
│  Total:     $74.97                   │
├──────────────────────────────────────┤
│  [Checkout]                          │  ← 参考 Submit order 系列
└──────────────────────────────────────┘
```

**美工修改项：** part 4 购物车流程已完整，转为响应式布局即可。

---

### 4.4 结算/支付页

**素材来源：** **完全以 part 4 为主**

| 组件 | Part 4 具体位置 |
|------|----------------|
| **支付方式-添加新卡** | `C:\py文档\part 4\Payment methods\Add a new card\` |
| **支付方式-编辑卡** | `C:\py文档\part 4\Payment methods\Edit my card\` |
| **支付方式-首次添加** | `C:\py文档\part 4\Payment methods\First time\` |
| **支付方式-管理** | `C:\py文档\part 4\Payment methods\Management\` |
| **地址管理-1** | `C:\py文档\part 4\Address\快3-2-0.png` |
| **地址管理-2** | `C:\py文档\part 4\Address\快3-2-1.png` |
| **地址管理-3** | `C:\py文档\part 4\Address\快3-2-2.png` |
| **地址管理-4** | `C:\py文档\part 4\Address\快3-2-3.png` |
| **地址管理-5** | `C:\py文档\part 4\Address\快3-2-4.png` |

**结算页布局：**

```
┌──────────────────────────────────────┐
│  1. Shipping Address                 │  ← 参考 Address 系列
│  2. Payment Method                   │  ← 参考 Payment methods 系列
│  3. Review & Submit                  │  ← 参考 Cart/Submit order 系列
└──────────────────────────────────────┘
```

**美工修改项：**
- 结算页改为单页流：地址 → 支付 → 确认（三步或单页表单）
- 支付方式接入 Stripe，保留卡输入 UI，参考 part 4 的 `Add a new card`

---

### 4.5 订单查询页（买家端）

**素材来源：** **part 4 Orders 系列**

| 组件 | Part 4 具体位置 |
|------|----------------|
| **订单列表** | `C:\py文档\part 4\Orders\CitigooPay-65-i2-2.png` |
| **订单详情-1** | `C:\py文档\part 4\Orders\CitigooPay-66-i2-2.png` |
| **订单详情-2** | `C:\py文档\part 4\Orders\CitigooPay-66-i2-3.png` |
| **订单详情-3** | `C:\py文档\part 4\Orders\CitigooPay-66-i2-4.png` |
| **订单详情-4** | `C:\py文档\part 4\Orders\CitigooPay-66-i2-5.png` |
| **订单物流** | `C:\py文档\part 4\Orders\CitigooPay-67-i2-2.png` |
| **订单追踪** | `C:\py文档\part 4\Orders\CitigooPay-71-i2-2.png` |

**订单列表布局：**

```
┌──────────────────────────────────────┐
│  My Orders                           │
├──────────────────────────────────────┤
│  Order #12345                        │  ← 参考 CitigooPay-66 系列
│  Status: Shipped ✓                   │
│  Track Package  →                    │
├──────────────────────────────────────┤
│  Order #12344                        │
│  Status: Processing                  │
└──────────────────────────────────────┘
```

**美工修改项：** 订单列表已有完整设计，直接转为响应式。PC 端可用表格布局。

---

### 4.6 物流追踪页（买家端）🆕

**无 part 4 素材，需全新设计。**

```
┌──────────────────────────────────────┐
│  Tracking #: xxx                     │
│  Carrier: FedEx                      │
├──────────────────────────────────────┤
│  ● Shipped          May 24           │
│  │  Origin scan                      │
│  ● In Transit       May 25           │
│  │  Memphis, TN                      │
│  ○ Out for Delivery                  │
│  ○ Delivered                         │
└──────────────────────────────────────┘
```

**参考：** 主流电商（Amazon/Shopify）的物流时间轴样式，复用 citigoo.com 橙色主题。

---

### 4.7 登录/注册页

**素材来源：** **完全复用 part 4**

**邮箱+手机号注册：**

| 组件 | Part 4 具体位置 |
|------|----------------|
| **注册-1** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-118.png` |
| **注册-2** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-119.png` |
| **注册-3** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-120.png` |
| **注册-4** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-121.png` |
| **注册-5** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-122.png` |
| **注册-6** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-123.png` |
| **注册-7** | `C:\py文档\part 4\Login & register\Register by Email and Mobile\CitigooPay-124.png` |

**仅邮箱注册：**

| 组件 | Part 4 具体位置 |
|------|----------------|
| **注册-1** | `C:\py文档\part 4\Login & register\Register by Email only\CitigooPay-118.png` |
| **注册-2** | `C:\py文档\part 4\Login & register\Register by Email only\CitigooPay-120.png` |
| **注册-3** | `C:\py文档\part 4\Login & register\Register by Email only\CitigooPay-121.png` |
| **注册-4** | `C:\py文档\part 4\Login & register\Register by Email only\CitigooPay-123.png` |
| **注册-5** | `C:\py文档\part 4\Login & register\Register by Email only\CitigooPay-124.png` |

**美工修改项：** 几乎没有。已有的两套设计直接转为 Next.js 页面。

---

### 4.8 辅助页面

| 页面 | 主要来源 | Part 4 素材 |
|------|---------|------------|
| **帮助中心** | citigoo.com `/helpCenter` | `C:\py文档\part 4\Help center\CitigooPay-157.png` `C:\py文档\part 4\Help center\CitigooPay-158.png` `C:\py文档\part 4\Help center\CitigooPay-159.png` |
| **关于我们** | citigoo.com `/aboutUs` | `C:\py文档\part 4\About\Citigoo201-1.png` `C:\py文档\part 4\About\Citigoo201-2.png` `C:\py文档\part 4\About\Citigoo201-3.png` + `C:\py文档\part 4\Shop pages\About\` 下 8 张 |
| **条款/隐私** | citigoo.com `/policies` | `C:\py文档\part 4\Terms and policies\CitigooPay-155.png` `C:\py文档\part 4\Terms and policies\CitigooPay-156.png` |
| **搜索页** | part 4 | `C:\py文档\part 4\Search\CitigooPay-125.png` `C:\py文档\part 4\Search\CitigooPay-126.png` `C:\py文档\part 4\Search\CitigooPay-127.png` `C:\py文档\part 4\Search\CitigooPay-128-i2.png` |
| **收藏页** | part 4 | `C:\py文档\part 4\Saved\3-3-2d-1.png` `C:\py文档\part 4\Saved\3-3-2d-2.png` |
| **评价页** | part 4 | `C:\py文档\part 4\Reviews\pending review\` `C:\py文档\part 4\Reviews\reviewed\` |
| **通知** | part 4 | `C:\py文档\part 4\Notifications\` 下 5 张（CitigooPay-172 / 173 系列） |
| **优惠券** | part 4 | `C:\py文档\part 4\Coupon\Citigoo-205-a1-1.png` `C:\py文档\part 4\Coupon\Citigoo-205-a1-2.png` |
| **个人中心** | part 4 | `C:\py文档\part 4\Me (after login)\mobile_2_1_1.png` |
| **退出登录** | part 4 | `C:\py文档\part 4\Log out\CitigooPay-154-2.png` |

---

## 5. Logo 资源

| 用途 | Part 4 具体位置 |
|------|----------------|
| 横向 Logo (500x150) | `C:\py文档\part 4\@icons logo_citigoo\logo_citigoo_3_500x150.png` |
| 方形 Logo (500x500) | `C:\py文档\part 4\@icons logo_citigoo\logo_citigoo_3_500x500.png` |
| 大方形 Logo (1024x1024) | `C:\py文档\part 4\@icons logo_citigoo\logo_citigoo_3_1024X1024.png` |
| 方形 Logo v4 (512x512) | `C:\py文档\part 4\@icons logo_citigoo\logo_citigoo_4_512X512.png` |

---

## 6. 页面路由总表

```
买家端 (Storefront)
  /                      首页
  /products/[slug]       商品详情
  /cart                  购物车
  /checkout              结算
  /orders/lookup         订单查询
  /orders/[id]/tracking  物流追踪
  /login                 登录
  /register              注册
  /search                搜索
  /saved                 收藏
  /help                  帮助中心
  /about                 关于
  /policies              条款

卖家端 (Admin Dashboard)
  /admin                 首页/Dashboard
  /admin/ai-generate     AI 产品生成
  /admin/ai-generate/[id] 生成进度/结果
  /admin/products        产品列表
  /admin/products/draft/[id] 草稿编辑
  /admin/orders          订单列表
  /admin/orders/[id]/fulfillment 履约详情
  /admin/settings        店铺设置
```

---

## 7. 全局设计规范

| 规范 | 值 |
|------|-----|
| 主色 | 橙色 `#F97316` |
| 背景 | 白色 `#FFFFFF` / 浅灰 `#F9FAFB` |
| 字体 | Geist（Next.js 默认，citigoo.com 在用） |
| 图标库 | Lucide Icons（citigoo.com 在用） |
| 圆角 | 按钮 `rounded-full`，卡片 `rounded-lg` |
| 响应式 | mobile `<768` / tablet `768-1024` / desktop `>1024` |
| Logo | `C:\py文档\part 4\@icons logo_citigoo\logo_citigoo_3_500x150.png` |

---

## 8. 美工工作量评估

```
┌──────────────────────────────┬──────────┬────────────────────────┐
│          页面                 │  工作量   │         说明            │
├──────────────────────────────┼──────────┼────────────────────────┤
│ 🆕 AI 产品生成页              │  ⭐⭐⭐⭐ │ 全新设计，无素材        │
│ 🆕 AI 生成进度/结果页         │  ⭐⭐⭐⭐ │ 全新设计，4 种状态      │
│ 🆕 产品草稿编辑页             │  ⭐⭐⭐   │ 参考 Shopify 布局       │
│ 🆕 产品管理列表页             │  ⭐⭐    │ 标准表格+卡片布局       │
│ 🆕 订单管理页（卖家）         │  ⭐⭐    │ 参考 part 4 Orders      │
│ 🆕 履约追踪页                 │  ⭐⭐⭐  │ 全新设计，时间轴        │
│ 🆕 店铺设置页                 │  ⭐     │ 参考 part 4 Settings    │
├──────────────────────────────┼──────────┼────────────────────────┤
│ 首页 (part 4 + citigoo.com)  │  ⭐⭐    │ 整合改品类名            │
│ 商品详情 (part 4 为主)       │  ⭐⭐⭐  │ 移动端→响应式           │
│ 购物车+结算 (part 4 为主)    │  ⭐⭐    │ 转响应式                │
│ 订单查询 (part 4 为主)       │  ⭐     │ 已有设计                │
│ 🆕 物流追踪（买家）           │  ⭐⭐⭐  │ 全新设计                │
│ 登录/注册 (part 4 复用)      │  ⭐     │ 直接转换                │
│ 辅助页 (citigoo.com)         │  ⭐     │ 微调复用                │
├──────────────────────────────┼──────────┼────────────────────────┤
│ 总计                         │ ~35 个页面/状态                   │
└──────────────────────────────┴──────────┴────────────────────────┘
```

---

## 9. 关键设计原则

1. **AI 页面要有"生成感"** — 进度动画、骨架屏、状态流转，不能只是表单+等待
2. **卖家端和买家端视觉统一** — 同一套颜色/字体/图标，但卖家端可更紧凑、信息密度更高
3. **移动端优先设计卖家端** — 很多卖家会用手机管理店铺
4. **AI 生成结果每个字段必须可编辑** — 不要让用户觉得 AI 输出不可改
5. **所有页面支持 store_id 上下文** — 前端虽暂做 default_store，但架构预留多店铺
6. **Part 4 的 PSD 源文件优先使用** — 需要改文案/颜色时从 PSD 出图，不要直接改 PNG
