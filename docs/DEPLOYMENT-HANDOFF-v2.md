# CitiGoo 服务器部署交接文档 v2

> **创建时间**: 2026-07-13
>
> **服务器**: `162.0.214.180` (Ubuntu)

---

## 一、项目架构

### 1.1 整体架构

```
CitiGoo - AI POD 电商平台
├── Buyer Storefront (买家店面)     → http://162.0.214.180:3000
├── Seller Dashboard (卖家后台)     → http://162.0.214.180:5173
├── Medusa Backend (API 后端)       → http://162.0.214.180:9000
├── AI Worker (AI 生成服务)         → http://162.0.214.180:8001
├── PostgreSQL (数据库)            → 162.0.214.180:5432
└── Redis (缓存)                   → 162.0.214.180:6379
```

### 1.2 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | MedusaJS v2 (Node.js + TypeScript) |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 |
| AI Worker | Python FastAPI |
| 买家端 | React + Vite |
| 卖家端 | React + Vite |
| 供应商 API | S2BDIY Open API |
| 支付 | Stripe |
| 部署 | Docker Compose |

### 1.3 数据库连接

```
postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo
```

**注意**: 数据库名是 `citigoo`，不是 `citigoo_prod`。

### 1.4 S2BDIY API 配置

```
API Base URL: https://opentest.s2bdiy.com
App Key: wm001
App Secret: 7b55d8cf04caf3db9232c98eadeb9cc2
Platform ID: 99
Store ID: 4390
```

### 1.5 Docker 服务

```bash
# 查看服务状态
docker compose -f infra/docker-compose.prod.yml --env-file .env ps

# 所有 docker 命令都需要 --env-file .env
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d
docker compose -f infra/docker-compose.prod.yml --env-file .env restart medusa-backend
docker compose -f infra/docker-compose.prod.yml --env-file .env logs medusa-backend --tail 20
```

**重要**: 所有 `docker compose` 命令必须加 `--env-file .env`，否则会报环境变量缺失错误。

---

## 二、已完成的工作

### 2.1 S2BDIY 产品数据导入 ✅

- 从 S2BDIY API 获取了 **1592 个真实产品**
- 产品包含英文标题 (`en_name`)、中文名称、价格、颜色、尺码等
- 从 API 获取了 **1592 个产品的英文描述** (HTML 格式，已去除标签)
- 所有数据保存在本地文件:
  - `scripts/s2bdiy-products.json` — 产品基本信息
  - `scripts/s2bdiy-descriptions.json` — 产品英文描述

### 2.2 导入脚本 ✅

| 脚本 | 功能 |
|------|------|
| `scripts/fetch-s2bdiy-products.js` | 从 S2BDIY API 获取所有产品保存到 JSON |
| `scripts/fetch-descriptions.js` | 从 S2BDIY API 获取所有产品描述保存到 JSON |
| `scripts/import-s2bdiy-to-db.js` | 将产品从 JSON 导入数据库 |
| `scripts/insert-remaining.js` | 插入遗漏的产品 |
| `scripts/batch-update-desc.js` | 批量更新产品描述 |
| `scripts/sync-s2bdiy-products.js` | 完整同步脚本 (获取+导入) |

### 2.3 代码修改 ✅

| 文件 | 修改内容 |
|------|----------|
| `apps/medusa-backend/medusa-config.ts` | 添加 `admin: { disable: true }` 禁用内置 admin 面板 |
| `docs/DEPLOYMENT-HANDOFF.md` | 创建部署交接文档 v1 |

**注意**: `admin: { disable: true }` 已推送到 git，但服务器上的 Docker 镜像可能还没有包含这个修改（构建卡在 npm ci）。

---

## 三、当前问题（未完成）

### 3.1 核心问题：Medusa 后端无法启动 ❌

**根本原因**: 数据库表结构不匹配。

数据库是手动创建的，只有自定义表（`mc_product`, `mc_store` 等），缺少 Medusa v2 运行所需的标准核心表。即使手动创建了这些表，列定义（类型、默认值、约束）也与 Medusa 期望的不一致，导致各种报错。

**尝试过的修复（均未彻底解决）**:
1. 手动 ALTER TABLE 添加缺少的列 — 不断有新列缺失
2. 手动 CREATE TABLE 创建缺少的表 — 列类型不匹配（如 `api_key.salt`、`currency.raw_rounding`）
3. 运行 `npx medusa db:migrate` — 卡住无响应
4. 用 `docker cp` 复制修改后的配置文件 — 临时方案，重启后丢失
5. 重新构建 Docker 镜像 — `npm ci` 步骤耗时 10+ 分钟，卡住

**当前日志最后报错**:
```
Error starting server: column "salt" of relation "api_key" does not exist
```

### 3.2 其他问题

| 问题 | 说明 |
|------|------|
| SSH 不通 | 从本地无法 SSH 到服务器，只能通过数据库直连和用户提供日志来操作 |
| 数据库连接不稳定 | 使用 `ssl: false` 才能连接，有时会 ECONNRESET |
| npm ci 构建慢 | 服务器网络慢，`npm ci` 耗时 10+ 分钟甚至卡住 |
| notification_provider channels | Medusa 插入 `'{feed}'` 不是合法 JSON，需要将列改为 TEXT 类型 |

---

## 四、推荐的解决方案

### 最可靠方案：重建数据库 + 让 Medusa 自己建表

```bash
# 1. 停止 medusa
docker compose -f infra/docker-compose.prod.yml --env-file .env stop medusa-backend

# 2. 删除旧库，创建新库
docker compose -f infra/docker-compose.prod.yml --env-file .env exec postgres psql -U citigoo -c "DROP DATABASE citigoo; CREATE DATABASE citigoo;"

# 3. 用一次性容器运行迁移（让 Medusa 创建所有正确的表结构）
docker compose -f infra/docker-compose.prod.yml --env-file .env run --rm medusa-backend npx medusa db:migrate

# 4. 如果 db:migrate 卡住，尝试用 medusa start（它会自动运行迁移）
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d medusa-backend

# 5. 等 30 秒后检查
sleep 30 && curl -s http://localhost:9000/health

# 6. 创建管理员账号
docker compose -f infra/docker-compose.prod.yml --env-file .env exec medusa-backend npx medusa user -e admin@citigoo.app -p admin123

# 7. 重新导入产品
node scripts/import-s2bdiy-to-db.js
node scripts/batch-update-desc.js
```

### 如果 db:migrate 卡住的替代方案

1. 删除数据库中所有非 `mc_` 开头的表（手动创建的 Medusa 表）
2. 保留 `mc_product`, `mc_product_category`, `mc_store`, `mc_supplier`, `mc_supplier_product`, `mc_supplier_product_variant` 等自定义表
3. 让 Medusa 通过 `start` 命令自动创建它需要的表

---

## 五、导入的产品数据

### 5.1 数据来源

- **API**: S2BDIY Open API (`/open/v1/basicProduct`)
- **认证**: OAuth (`/open/v1/accessToken` 获取 token)
- **分页**: 每页 20 条，共 80 页

### 5.2 数据结构

每个产品包含:
- `product_id` / `id` — S2BDIY 产品 ID
- `product_name` / `name` — 中文名称
- `en_name` — 英文名称
- `purchase_price` — 采购价
- `colors[]` — 颜色选项
- `sizes[]` — 尺码选项
- `views[]` — 打印面
- `view_image_src` — 产品图片 URL
- `blank_design_image` — 空白设计图 URL

### 5.3 导入到数据库的字段映射

```javascript
id:           `prod_s2bdiy_${product.id}`
store_id:     'default_store'
title:        product.en_name || product.name  // 优先英文
description:  从 detail API 获取的英文描述
status:       'draft'
price:        product.purchase_price
cost:         product.purchase_price
metadata:     { supplier_product_id, colors, sizes, views, image_url, ... }
```

---

## 六、本地备份文件

| 文件 | 内容 | 大小 |
|------|------|------|
| `scripts/s2bdiy-products.json` | 1592 个产品基本信息 | ~5MB |
| `scripts/s2bdiy-descriptions.json` | 1592 个产品英文描述 | ~10MB |

**导入脚本**: `node scripts/import-s2bdiy-to-db.js` + `node scripts/batch-update-desc.js`

---

## 七、环境变量 (.env)

文件位置: `/opt/ai-commerce-platform/.env`

```env
POSTGRES_USER=citigoo
POSTGRES_PASSWORD=89fd0c304c45bbe483b2698e07ce5109
POSTGRES_DB=citigoo
POSTGRES_PORT=5432
REDIS_PORT=6379
JWT_SECRET=citigoo_jwt_secret_2024
COOKIE_SECRET=citigoo_cookie_secret_2024
STORE_CORS=http://162.0.214.180:3000,http://162.0.214.180:5173
ADMIN_CORS=http://162.0.214.180:5173
AUTH_CORS=http://162.0.214.180:3000,http://162.0.214.180:5173
MEDUSA_BACKEND_URL=http://162.0.214.180:9000
MEDUSA_PORT=9000
DEFAULT_STORE_ID=default_store
PUBLISHABLE_API_KEY=pk_test_51234567890
STRIPE_API_KEY=sk_test_51234567890
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890
AI_WORKER_PORT=8001
AI_WORKER_MOCK_GENERATION=true
AI_WORKER_PUBLIC_BASE_URL=http://162.0.214.180:8001/static
S2BDIY_MOCK_MODE=false
S2BDIY_API_BASE_URL=https://opentest.s2bdiy.com
S2BDIY_APP_KEY=wm001
S2BDIY_APP_SECRET=7b55d8cf04caf3db9232c98eadeb9cc2
S2BDIY_PLATFORM_ID=99
S2BDIY_STORE_ID=4390
STOREFRONT_PORT=3000
SELLER_PORT=5173
VITE_API_URL=http://162.0.214.180:9000
MEDUSA_ADMIN=false
```

---

## 八、操作要点

### 8.1 Docker 命令必须加 --env-file

```bash
# 正确
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d

# 错误（会报环境变量缺失）
docker compose -f infra/docker-compose.prod.yml up -d
```

### 8.2 数据库连接必须用 ssl: false

```javascript
const db = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,  // 必须！
  connectionTimeoutMillis: 10000
});
```

### 8.3 禁用 Admin 面板

`medusa-config.ts` 中已添加:
```typescript
export default defineConfig({
  admin: { disable: true },  // 你已经有单独的 seller-dashboard
  projectConfig: { ... }
})
```

### 8.4 创建管理员账号

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env exec medusa-backend npx medusa user -e admin@citigoo.app -p admin123
```

---

## 九、任务清单

- [ ] 修复 Medusa 后端启动问题（重建数据库 + 正确迁移）
- [ ] 重新导入 1592 个产品到新数据库
- [ ] 重新更新产品英文描述
- [ ] 验证 Seller Dashboard 可以管理产品
- [ ] 验证 Storefront 可以浏览产品
- [ ] 重新构建 Docker 镜像（包含 admin: disable 配置）
- [ ] 创建管理员账号
- [ ] 测试完整业务流程

---

## 十、联系信息

如需帮助，查看服务器日志:
```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env logs medusa-backend --tail 50
```
