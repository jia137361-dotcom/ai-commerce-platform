# CitiGoo 部署指南

## 概述

本文档指导如何将 CitiGoo 部署到云服务器（阿里云/腾讯云/AWS），包括数据库迁移和产品目录导入。

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     云服务器 (Linux)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL  │  │   Redis     │  │      Nginx         │ │
│  │   (5432)    │  │   (6379)    │  │   (80/443)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Medusa    │  │ AI Worker   │  │    Storefront      │ │
│  │  (9000)     │  │  (8001)     │  │     (3000)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Seller Dashboard (5173)                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 前置条件

### 1. 服务器要求

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2核 | 4核 |
| 内存 | 4GB | 8GB |
| 硬盘 | 40GB SSD | 100GB SSD |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 |

### 2. 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 验证安装
docker --version
docker compose version
```

### 3. 配置域名

建议准备以下域名：
- `citigoo.app` - 买家店面
- `admin.citigoo.app` - 卖家仪表盘
- `api.citigoo.app` - 后端API

---

## 部署步骤

### 步骤 1: 克隆代码到服务器

```bash
# SSH 连接服务器
ssh root@your-server-ip

# 克隆代码
cd /opt
git clone https://github.com/your-org/ai-commerce-platform.git
cd ai-commerce-platform
```

### 步骤 2: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**必须配置的变量：**

```bash
# 数据库密码 (必须设置!)
POSTGRES_PASSWORD=your-strong-password

# JWT 和 Cookie 密钥 (必须设置!)
JWT_SECRET=your-random-jwt-secret
COOKIE_SECRET=your-random-cookie-secret

# Stripe 密钥
STRIPE_API_KEY=sk_live_xxxxx
PUBLISHABLE_API_KEY=pk_live_xxxxx

# 域名配置
STORE_CORS=https://citigoo.app
ADMIN_CORS=https://admin.citigoo.app
AUTH_CORS=https://citigoo.app,https://admin.citigoo.app

# AI 服务 (可选，生产环境建议关闭 mock)
AI_WORKER_MOCK_GENERATION=false
DASHSCOPE_API_KEY=your-dashscope-key
DEEPSEEK_API_KEY=your-deepseek-key
```

### 步骤 3: 构建并启动服务

```bash
# 构建所有镜像
docker compose -f infra/docker-compose.prod.yml build

# 启动基础设施
docker compose -f infra/docker-compose.prod.yml up -d postgres redis

# 等待数据库就绪
sleep 10

# 启动 Medusa 后端
docker compose -f infra/docker-compose.prod.yml up -d medusa-backend

# 等待后端就绪
sleep 15
```

### 步骤 4: 运行数据库迁移

```bash
# 运行迁移
docker compose -f infra/docker-compose.prod.yml exec medusa-backend \
  npx medusa db:migrate

# 导入种子数据
docker compose -f infra/docker-compose.prod.yml exec medusa-backend \
  npx medusa exec ./src/scripts/seed.ts
```

### 步骤 5: 启动所有服务

```bash
# 启动所有服务
docker compose -f infra/docker-compose.prod.yml up -d

# 查看状态
docker compose -f infra/docker-compose.prod.yml ps
```

### 步骤 6: 导入 S2BDIY 产品目录

```bash
# 导入分类结构
docker compose -f infra/docker-compose.prod.yml exec medusa-backend \
  npx medusa exec ./src/scripts/import-s2bdiy-catalog.ts

# 同步产品数据 (需要网络访问 S2BDIY API)
docker compose -f infra/docker-compose.prod.yml exec medusa-backend \
  npx medusa exec ./src/scripts/sync-s2bdiy-products.ts
```

---

## 验证部署

### 1. 检查服务状态

```bash
docker compose -f infra/docker-compose.prod.yml ps
```

预期输出：
```
NAME                STATUS
citigoo-postgres    running (healthy)
citigoo-redis       running (healthy)
citigoo-medusa      running (healthy)
citigoo-ai-worker   running (healthy)
citigoo-storefront  running
citigoo-seller      running
```

### 2. 测试 API

```bash
# 健康检查
curl http://localhost:9000/health

# 测试 Storefront API
curl http://localhost:9000/store/products

# 测试 AI Worker
curl http://localhost:8001/health
```

### 3. 访问前端

- 买家店面: `http://your-server-ip:3000`
- 卖家仪表盘: `http://your-server-ip:5173`

---

## 配置 Nginx 反向代理

### 安装 Nginx

```bash
sudo apt install nginx -y
```

### 配置站点

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/citigoo
```

**配置内容：**

```nginx
# 买家店面
server {
    listen 80;
    server_name citigoo.app www.citigoo.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 卖家仪表盘
server {
    listen 80;
    server_name admin.citigoo.app;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 后端 API
server {
    listen 80;
    server_name api.citigoo.app;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ai-worker/ {
        proxy_pass http://localhost:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 支持 (如果有)
    location /ws {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/citigoo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置 SSL (推荐)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d citigoo.app -d www.citigoo.app -d admin.citigoo.app -d api.citigoo.app
```

---

## 常用运维命令

### 查看日志

```bash
# 所有服务日志
docker compose -f infra/docker-compose.prod.yml logs -f

# 特定服务日志
docker compose -f infra/docker-compose.prod.yml logs -f medusa-backend
docker compose -f infra/docker-compose.prod.yml logs -f ai-worker
```

### 重启服务

```bash
# 重启所有服务
docker compose -f infra/docker-compose.prod.yml restart

# 重启特定服务
docker compose -f infra/docker-compose.prod.yml restart medusa-backend
```

### 停止服务

```bash
docker compose -f infra/docker-compose.prod.yml down
```

### 数据库备份

```bash
# 备份数据库
docker compose -f infra/docker-compose.prod.yml exec postgres \
  pg_dump -U citigoo citigoo_prod > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose -f infra/docker-compose.prod.yml exec -T postgres \
  psql -U citigoo citigoo_prod < backup_20240101.sql
```

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建并部署
docker compose -f infra/docker-compose.prod.yml build
docker compose -f infra/docker-compose.prod.yml up -d

# 运行迁移 (如果有新的)
docker compose -f infra/docker-compose.prod.yml exec medusa-backend \
  npx medusa db:migrate
```

---

## 故障排查

### 1. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose -f infra/docker-compose.prod.yml logs postgres

# 测试连接
docker compose -f infra/docker-compose.prod.yml exec postgres \
  psql -U citigoo -d citigoo_prod -c "SELECT 1;"
```

### 2. Medusa 启动失败

```bash
# 查看详细日志
docker compose -f infra/docker-compose.prod.yml logs medusa-backend

# 进入容器调试
docker compose -f infra/docker-compose.prod.yml exec medusa-backend sh
```

### 3. AI Worker 错误

```bash
# 检查 Python 依赖
docker compose -f infra/docker-compose.prod.yml exec ai-worker \
  pip list

# 查看 AI Worker 日志
docker compose -f infra/docker-compose.prod.yml logs ai-worker
```

---

## 安全建议

1. **使用强密码**: 数据库密码、JWT Secret 等使用随机强密码
2. **限制端口**: 只暴露必要端口 (80, 443)
3. **启用防火墙**:
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
4. **定期备份**: 设置自动数据库备份
5. **监控**: 使用 Docker logs 或外部监控工具

---

## 环境变量完整参考

| 变量名 | 必填 | 说明 |
|--------|------|------|
| POSTGRES_PASSWORD | ✅ | 数据库密码 |
| JWT_SECRET | ✅ | JWT 签名密钥 |
| COOKIE_SECRET | ✅ | Cookie 签名密钥 |
| STRIPE_API_KEY | ✅ | Stripe API 密钥 |
| PUBLISHABLE_API_KEY | ✅ | Stripe 公钥 |
| STORE_CORS | ✅ | Storefront 域名 |
| ADMIN_CORS | ✅ | Admin 域名 |
| AI_WORKER_MOCK_GENERATION | ❌ | AI Mock 模式 (默认 false) |
| DASHSCOPE_API_KEY | ❌ | 通义千问密钥 |
| DEEPSEEK_API_KEY | ❌ | DeepSeek 密钥 |
| FAL_KEY | ❌ | Fal.ai 密钥 |

---

*最后更新: 2026-07-10*
