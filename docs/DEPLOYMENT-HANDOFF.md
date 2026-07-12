# CitiGoo 服务器部署交接文档

> **文档目的**: 确保新会话可以无缝衔接，继续完成部署和产品导入任务
>
> **创建时间**: 2026-07-12
>
> **服务器**: `162.0.214.180` (Ubuntu)

---

## 一、已完成的工作

### 1.1 代码修复 (已推送到 GitHub)

| 修复内容 | 文件 | 状态 |
|----------|------|------|
| ExecArgs 类型定义 | `apps/medusa-backend/src/types/medusa.ts` | ✅ 已推送 |
| seller/register 路由类型 | `apps/medusa-backend/src/api/seller/register/route.ts` | ✅ 已推送 |
| customer orders 导入路径 | `apps/medusa-backend/src/api/store/customers/me/orders/route.ts` | ✅ 已推送 |
| shared-types 导出路径 | `packages/shared-types/src/index.ts` | ✅ 已推送 |
| seed.ts 类型修复 | `apps/medusa-backend/src/scripts/seed.ts` | ✅ 已推送 |
| Storefront Dockerfile.prod | `apps/storefront/Dockerfile.prod` | ✅ 已推送 |
| Seller Dashboard Dockerfile.prod | `apps/seller-dashboard/Dockerfile.prod` | ✅ 已推送 |
| Medusa Backend Dockerfile.prod | `apps/medusa-backend/Dockerfile.prod` | ✅ 已推送 |
| AI Worker Dockerfile.prod | `apps/ai-worker/Dockerfile.prod` | ✅ 已推送 |
| 生产环境 docker-compose | `infra/docker-compose.prod.yml` | ✅ 已推送 |
| 部署脚本 | `scripts/deploy-server.sh` | ✅ 已推送 |
| 服务器设置脚本 | `scripts/setup-server.sh` | ✅ 已推送 |

### 1.2 服务器部署状态

| 组件 | 状态 | 端口 |
|------|------|------|
| PostgreSQL | ✅ 运行中 | 5432 |
| Redis | ✅ 运行中 | 6379 |
| Medusa Backend | ⚠️ 需要重启 | 9000 |
| AI Worker | ✅ 运行中 | 8001 |
| Storefront | ✅ 运行中 | 3000 |
| Seller Dashboard | ✅ 运行中 | 5173 |

### 1.3 数据库状态

**服务器信息**:
- IP: `162.0.214.180`
- 数据库名: `citigoo`
- 用户名: `citigoo`
- 密码: `89fd0c304c45bbe483b2698e07ce5109`
- 连接字符串: `postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo`

**已创建的表**:
- `mc_store` - 店铺表
- `mc_supplier` - 供应商表
- `mc_product_category` - 产品分类表
- `mc_supplier_product` - 供应商产品表
- `mc_supplier_product_variant` - 产品变体表
- `mc_product` - 产品表
- `fulfillment_order` - 履约订单表
- `mc_shipment` - 物流表
- `tax_provider` - 税务提供者
- `payment_provider` - 支付提供者
- `fulfillment_provider` - 履约提供者
- `notification_provider` - 通知提供者

**已导入的数据**:
- 店铺: `default_store`
- 供应商: `sup_s2bdiy`
- 分类: 11个一级 + 55个二级分类
- 产品: 413个示例产品（需要替换为真实产品）

---

## 二、S2BDIY 产品目录 (1513 products)

### 2.1 分类结构

```
1. Clothing & Underwear (188)
   ├── Men's Clothing (123)
   │   ├── T-shirts (46)
   │   ├── Sweatshirts (34)
   │   ├── Pajamas (12)
   │   ├── Pants (11)
   │   └── Underwear (4)
   ├── Women's Clothing (47)
   │   ├── T-shirts (16)
   │   ├── Skirts (8)
   │   ├── Swimwear (3)
   │   └── Long-sleeved shirts (12)
   └── Children's Clothing (18)
       ├── T-shirts (9)
       └── Sweatshirts (7)

2. Home Furnishings (588)
   ├── Interior Decorations (187)
   ├── Pillow Series (28)
   ├── Bathroom Supplies (29)
   ├── Bedding (36)
   ├── Outdoor Decorations (101)
   ├── Kitchen Supplies (36)
   ├── Cupwares (42)
   ├── Grooming Supplies (5)
   ├── Rain Gear (7)
   ├── Restaurant/Dining (32)
   └── Holiday Decorations (85)

3. Jewelry (38)
   ├── Necklaces (26)
   ├── Rings (3)
   └── Bracelets (9)

4. Pet Supplies (33)
   ├── Bandanas (9)
   ├── Home Furnishings (7)
   ├── Clothing (2)
   └── Accessories (15)

5. Protective Equipment (32)
   ├── Masks (21)
   └── Face Shields (11)

6. Sports & Outdoors (20)
   ├── Beach Gear (6)
   ├── Outdoor Activities (4)
   └── Sports Equipment (3)

7. Car Accessories (47)
   ├── Car Exterior (27)
   └── Car Interior (20)

8. Digital Accessories (273)
   ├── Apple Phone Cases (137)
   ├── Samsung Phone Cases (34)
   ├── Mouse Pads (30)
   └── Phone Stands (19)

9. Maternity & Baby (22)
   ├── Toys (18)
   └── Baby Supplies (3)

10. Shoes & Accessories (141)
    ├── Hats (61)
    ├── Clothing & Accessories (58)
    ├── Socks (14)
    └── Shoes (8)

11. Bags (131)
    ├── Storage Items (52)
    ├── Backpacks (31)
    ├── Lunch Bags (14)
    └── Wallets (9)
```

### 2.2 需要导入的真实产品

当前数据库有 **413 个示例产品**，需要替换为 **1513 个真实 S2BDIY 产品**。

真实产品导入需要：
1. 调用 S2BDIY API 获取产品数据
2. 包含真实的英文标题、描述、价格、SKU
3. 关联到正确的分类

---

## 三、接下来要做的事情

### 任务 1: 从 S2BDIY API 同步真实产品

**目标**: 将 1513 个真实产品导入数据库

**步骤**:

```bash
# 1. 删除示例产品
psql "postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo" \
  -c "DELETE FROM mc_product WHERE id LIKE 'prod_%';"

# 2. 创建产品同步脚本
# 需要编写 Node.js 脚本调用 S2BDIY API

# 3. 运行同步脚本
node scripts/sync-s2bdiy-products.js
```

**S2BDIY API 配置** (从 .env 文件):
```
S2BDIY_API_BASE_URL=https://opentest.s2bdiy.com
S2BDIY_APP_KEY=wm001
S2BDIY_APP_SECRET=7b55d8cf04caf3db9232c98eadeb9cc2
S2BDIY_PLATFORM_ID=99
S2BDIY_STORE_ID=4390
```

### 任务 2: 验证 Medusa Backend 启动

```bash
# 检查服务状态
docker compose -f infra/docker-compose.prod.yml ps

# 如果 medusa-backend 没运行，重启它
docker compose -f infra/docker-compose.prod.yml restart medusa-backend

# 检查健康状态
curl http://localhost:9000/health
```

### 任务 3: 测试 API 端点

```bash
# 测试产品列表
curl http://localhost:9000/store/products

# 测试分类列表
curl http://localhost:9000/store/product-categories

# 测试店铺信息
curl http://localhost:9000/store/stores/default_store
```

---

## 四、新会话执行指南

### 步骤 1: 读取本文档

```bash
cat /opt/ai-commerce-platform/docs/DEPLOYMENT-HANDOFF.md
```

### 步骤 2: 检查服务器状态

```bash
# 检查所有服务
docker compose -f infra/docker-compose.prod.yml ps

# 检查数据库连接
psql "postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo" \
  -c "SELECT count(*) FROM mc_product;"
```

### 步骤 3: 执行产品同步

**方案 A: 从 S2BDIY API 同步真实产品**

需要编写同步脚本，调用 S2BDIY API 获取产品数据。

**方案 B: 使用本地数据文件**

如果有产品数据的 CSV/JSON 文件，可以直接导入。

### 步骤 4: 验证部署

```bash
# 测试后端
curl http://localhost:9000/health

# 测试产品
curl http://localhost:9000/store/products | head -c 500
```

---

## 五、S2BDIY API 信息

### 5.1 API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/product/list` | 获取产品列表 |
| `POST /api/product/detail` | 获取产品详情 |
| `POST /api/product/category` | 获取分类列表 |

### 5.2 认证信息

```
App Key: wm001
App Secret: 7b55d8cf04caf3db9232c98eadeb9cc2
Platform ID: 99
Store ID: 4390
```

### 5.3 API 基础 URL

```
https://opentest.s2bdiy.com
```

---

## 六、数据库连接信息

### 6.1 连接字符串

```
postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo
```

### 6.2 通过 psql 连接

```bash
psql "postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo"
```

### 6.3 通过 Docker 连接

```bash
docker compose -f infra/docker-compose.prod.yml exec postgres psql -U citigoo -d citigoo
```

---

## 七、常用命令

### 7.1 服务管理

```bash
# 查看服务状态
docker compose -f infra/docker-compose.prod.yml ps

# 启动所有服务
docker compose -f infra/docker-compose.prod.yml up -d

# 停止所有服务
docker compose -f infra/docker-compose.prod.yml down

# 重启某个服务
docker compose -f infra/docker-compose.prod.yml restart medusa-backend

# 查看日志
docker compose -f infra/docker-compose.prod.yml logs -f medusa-backend
```

### 7.2 数据库操作

```bash
# 连接数据库
psql "postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo"

# 查看表
\dt

# 查看产品数量
SELECT count(*) FROM mc_product;

# 查看分类
SELECT id, name, parent_id FROM mc_product_category LIMIT 20;
```

### 7.3 产品导入

```bash
# 删除示例产品
psql "postgresql://citigoo:89fd0c304c45bbe483b2698e07ce5109@162.0.214.180:5432/citigoo" \
  -c "DELETE FROM mc_product WHERE id LIKE 'prod_%';"

# 导入真实产品 (需要先创建同步脚本)
node scripts/sync-s2bdiy-products.js
```

---

## 八、故障排除

### 8.1 Medusa Backend 启动失败

```bash
# 查看日志
docker compose -f infra/docker-compose.prod.yml logs medusa-backend

# 常见错误: 数据库表不存在
# 解决: 运行迁移
docker compose -f infra/docker-compose.prod.yml exec medusa-backend npx medusa db:migrate
```

### 8.2 数据库连接问题

```bash
# 检查 PostgreSQL 状态
docker compose -f infra/docker-compose.prod.yml ps

# 重启 PostgreSQL
docker compose -f infra/docker-compose.prod.yml restart postgres
```

### 8.3 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 5432

# 修改 .env 文件中的端口配置
```

---

## 九、下一步任务清单

- [ ] 从 S2BDIY API 同步 1513 个真实产品
- [ ] 验证 Medusa Backend 正常启动
- [ ] 测试所有 API 端点
- [ ] 配置域名和 SSL (可选)
- [ ] 配置 Stripe 正式密钥 (可选)

---

## 十、联系信息

如有问题，查看本文档或检查服务器日志：

```bash
# 查看服务状态
docker compose -f infra/docker-compose.prod.yml ps

# 查看日志
docker compose -f infra/docker-compose.prod.yml logs -f
```
