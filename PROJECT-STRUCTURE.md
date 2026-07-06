# CitiGoo 项目结构文档

## 1. 项目概述

**项目名称**: CitiGoo / citigoo.app  
**项目类型**: AI Commerce + POD (Print-on-Demand) 独立商店  
**核心架构**: AI产品生成 + 平台产品库 + 独立店铺 + Stripe支付 + 供应商履约 + 物流跟踪

---

## 2. 当前开发阶段

当前主要开发阶段: **Phase 2A + Phase 2B**

- **Phase 2A**: AI产品生成 + 打印文件 + 产品草稿
- **Phase 2B**: 供应商 + 物流履约

**当前实际目标**:
```
AI产品生成 → 产品草稿 → 发布 → 买家付款 → 供应商履约 → 物流发货 → 跟踪返回 → 买家跟踪查询
```

---

## 3. 技术栈

### 前端层
| 应用 | 技术 | 职责 |
|------|------|------|
| `apps/storefront` | React / Vite / TailwindCSS | 买家店面：首页、产品列表、详情、购物车、结账、订单查询、物流跟踪 |
| `apps/seller-dashboard` | Vite / React / TailwindCSS | 卖家仪表盘：AI产品生成、产品管理、订单管理、履约跟踪、店铺设置 |

### 后端层
| 应用 | 技术 | 职责 |
|------|------|------|
| `apps/medusa-backend` | Node.js / TypeScript / MedusaJS / PostgreSQL | 产品、购物车、结账、订单、支付、履约、物流、Storefront API、Admin API |
| `apps/ai-worker` | Python / DeepSeek / Pillow / 图像处理 | 设计生成、mockup生成、打印文件生成、标题/描述生成、标签、SEO、价格建议 |

### 基础设施
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **容器化**: Docker / Docker Compose
- **支付**: Stripe
- **AI服务**: DeepSeek / Fal.ai

---

## 4. 项目目录结构

```
ai-commerce-platform/
├── apps/
│   ├── medusa-backend/          # MedusaJS后端服务
│   │   ├── src/                 # 源代码
│   │   │   ├── api/             # API路由
│   │   │   ├── modules/         # 自定义模块
│   │   │   ├── scripts/         # 数据库迁移、seed脚本
│   │   │   └── lib/             # 工具库
│   │   ├── migrations/          # 数据库迁移
│   │   ├── seed/                # 种子数据
│   │   └── package.json
│   │
│   ├── ai-worker/               # AI产品生成服务
│   │   ├── app/                 # FastAPI应用
│   │   │   ├── main.py          # 应用入口
│   │   │   ├── api/             # API路由
│   │   │   ├── services/        # 业务逻辑
│   │   │   └── providers/       # AI图像提供商
│   │   ├── tests/               # 测试
│   │   └── requirements.txt
│   │
│   ├── storefront/              # 买家店面 (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/           # 页面组件
│   │   │   ├── lib/             # API客户端、工具函数
│   │   │   ├── components/      # UI组件
│   │   │   └── styles/          # 样式
│   │   └── package.json
│   │
│   └── seller-dashboard/        # 卖家仪表盘 (Vite + React)
│       ├── src/
│       │   ├── pages/           # 页面组件
│       │   ├── components/      # UI组件
│       │   └── lib/             # 工具函数
│       ├── e2e/                 # Playwright端到端测试
│       └── package.json
│
├── docs/                        # 项目文档
│   ├── api.md                   # API参考文档
│   ├── schema.md                # 数据库Schema文档
│   ├── testing.md               # 测试指南
│   └── backend-capability-map.md # 后端能力地图
│
├── scripts/                     # 自动化脚本
│   ├── phase1-dev2-self-test.sh # Phase 1自测脚本
│   ├── phase2a-dev2-e2e.sh      # Phase 2A端到端测试
│   └── ...
│
├── postman/                     # Postman集合
│   └── CitiGoo-Medusa.postman_collection.json
│
├── infra/                       # 基础设施配置
│   └── docker-compose.yml       # Docker Compose配置
│
├── packages/                    # 共享包
│   └── shared-types/            # 共享TypeScript类型
│
└── package.json                 # 根package.json (workspaces)
```

---

## 5. 核心数据库模型

### 产品相关
- `mc_product` - 产品
- `mc_product_category` - 产品分类
- `mc_platform_product` - 平台产品（全局）
- `mc_supplier_product` - 供应商产品
- `mc_supplier_product_variant` - 供应商产品变体
- `mc_supplier_print_spec` - 打印规格

### AI生成
- `mc_ai_generation_job` - AI生成任务

### 订单相关
- `mc_order` - 订单
- `mc_fulfillment_order` - 履约订单
- `mc_shipment` - 物流发货

### 购物车
- `mc_cart` - 购物车
- `mc_cart_line_item` - 购物车商品

---

## 6. 核心API

### Storefront APIs (买家端)
| API | 职责 |
|-----|------|
| `GET /store/products` | 获取已发布产品列表 |
| `GET /store/products/:id` | 获取产品详情 |
| `GET /store/products/:id/reviews` | 获取产品评价 |
| `POST /store/products/:id/reviews` | 创建产品评价 |
| `POST /store/carts` | 创建购物车 |
| `POST /store/carts/:id/line-items` | 添加商品到购物车 |
| `POST /store/carts/:id/complete` | 完成结账 |
| `GET /store/orders/lookup` | 游客订单查询 |
| `GET /store/orders/:id/tracking` | 物流跟踪 |

### Admin APIs (管理端)
| API | 职责 |
|-----|------|
| `POST /admin/products/draft` | 创建产品草稿 |
| `POST /admin/products/:id/publish` | 发布产品 |
| `POST /admin/ai/generate` | 创建AI生成任务 |
| `GET /admin/ai/jobs/:id` | 查询AI任务状态 |
| `POST /admin/orders/:id/push-fulfillment` | 推送履约 |
| `POST /admin/orders/:id/mock-shipment` | 模拟发货 |

---

## 7. 开发工作流

### 团队分工
| 角色 | 职责 | 分支 |
|------|------|------|
| 开发1 | 产品系统、平台产品、供应商基础数据 | `feature/store-product` |
| 开发2 | AI Worker、购物车、结账、Stripe、订单、履约、物流、跟踪 | `feature/cart-payment-order` |
| 开发3 | 文档、Postman、Seed、测试、集成测试 | `feature/store-context-testing` |

### Git分支规则
- `main`: 稳定主分支
- `develop`: 日常集成分支
- `feature/*`: 功能分支

### 开发命令
```bash
# 启动所有服务
npm run dev:full

# 启动单个服务
npm run dev              # Medusa后端
npm run dev:seller       # 卖家仪表盘
npm run dev:storefront   # 买家店面
npm run dev:ai-worker    # AI Worker

# 数据库操作
npm run db:migrate       # 运行迁移
npm run seed             # 种子数据

# 测试
npm run test             # 后端测试
npm run test:seller      # 卖家仪表盘测试
```

---

## 8. 环境变量

关键环境变量（详见 `.env.example`）:

```bash
# Medusa后端
DEFAULT_STORE_ID=default_store
PUBLISHABLE_API_KEY=<your-key>
ADMIN_TOKEN=<your-token>

# AI Worker
AI_WORKER_MOCK_GENERATION=true  # 本地开发使用mock
FAL_KEY=<fal-key>               # Fal.ai图像生成
DEEPSEEK_API_KEY=<key>          # DeepSeek API

# Stripe
STRIPE_SECRET_KEY=<key>
```

---

## 9. 重要约束

### 禁止范围（当前不实现）
- Pinterest/TikTok自动化
- AI营销代理
- 50产品批量生成
- Stripe Connect
- 多店SaaS
- 复杂RBAC

### 架构原则
- 所有核心数据必须支持 `store_id`（为未来多店预留）
- 不要硬编码单店逻辑
- 优先使用 `getProductsByStore(store_id)` 而非 `getAllProducts()`

---

## 10. 阶段路线图

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 范围冻结 + 架构确认 | ✅ 完成 |
| Phase 1 | 单店交易MVP | ✅ 完成 |
| **Phase 2A** | **AI产品生成** | 🔄 进行中 |
| **Phase 2B** | **供应商 + 物流履约** | 🔄 进行中 |
| Phase 3 | 1688/阿里巴巴Dropshipping | ⏳ 待定 |
| Phase 4 | 卖家仪表盘增强 | ⏳ 待定 |
| Phase 5 | 买家店面增强 | ⏳ 待定 |

---

## 11. 关键文档

- [API参考](docs/api.md)
- [数据库Schema](docs/schema.md)
- [后端能力地图](docs/backend-capability-map.md)
- [团队Git流程](docs/team-git-workflow.md)
- [测试指南](docs/testing.md)

---

*最后更新: 2026-07-06*
