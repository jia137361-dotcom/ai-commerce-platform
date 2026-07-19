# CitiGoo 部署指南

## 服务器信息

- **服务器 IP**: 162.0.214.180
- **操作系统**: Ubuntu/Debian
- **部署方式**: Docker Compose

## 快速部署

### Linux/Mac

```bash
# SSH 登录服务器
ssh root@162.0.214.180

# 进入项目目录
cd /path/to/ai-commerce-platform

# 运行部署脚本
bash scripts/deploy.sh feat/platform-marketplace-20260705
```

### Windows (PowerShell)

```powershell
# SSH 登录服务器
ssh root@162.0.214.180

# 进入项目目录
cd C:\path\to\ai-commerce-platform

# 运行部署脚本
.\scripts\deploy.ps1 feat/platform-marketplace-20260705
```

## 手动部署步骤

### 1. 拉取最新代码

```bash
cd /path/to/ai-commerce-platform
git fetch origin
git checkout feat/platform-marketplace-20260705
git pull origin feat/platform-marketplace-20260705
```

### 2. 构建并重启容器

```bash
# 停止现有容器
docker compose -f infra/docker-compose.prod.yml down

# 重新构建并启动
docker compose -f infra/docker-compose.prod.yml up -d --build

# 查看容器状态
docker compose -f infra/docker-compose.prod.yml ps
```

### 3. 运行数据库迁移

```bash
# 进入后端容器
docker compose -f infra/docker-compose.prod.yml exec medusa-backend bash

# 运行迁移
npm run db:migrate

# 退出容器
exit
```

### 4. 更新供应商数据

```bash
# 更新 ship_from_country
docker compose -f infra/docker-compose.prod.yml exec medusa-backend node scripts/update-ship-from-area.js
```

## 服务地址

| 服务 | 地址 |
|------|------|
| Backend API | http://162.0.214.180:9000 |
| Storefront | http://162.0.214.180:3000 |
| Seller Dashboard | http://162.0.214.180:5173 |

## 常见问题

### 容器启动失败

```bash
# 查看容器日志
docker compose -f infra/docker-compose.prod.yml logs medusa-backend
docker compose -f infra/docker-compose.prod.yml logs ai-worker
```

### 数据库连接失败

```bash
# 检查数据库状态
docker compose -f infra/docker-compose.prod.yml exec postgres pg_isready

# 重启数据库
docker compose -f infra/docker-compose.prod.yml restart postgres
```

### 清理并重新部署

```bash
# 停止并删除所有容器和卷
docker compose -f infra/docker-compose.prod.yml down -v

# 重新构建并启动
docker compose -f infra/docker-compose.prod.yml up -d --build
```
