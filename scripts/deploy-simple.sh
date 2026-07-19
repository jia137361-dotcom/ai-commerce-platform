#!/bin/bash
# =============================================================================
# CitiGoo 简单部署脚本
# 用法: bash scripts/deploy-simple.sh
# =============================================================================

set -e

BRANCH="feat/platform-marketplace-20260705"
COMPOSE_FILE="infra/docker-compose.prod.yml"

echo "=========================================="
echo "CitiGoo 部署脚本"
echo "分支: $BRANCH"
echo "=========================================="

# 1. 拉取最新代码
echo "[1/5] 拉取最新代码..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 2. 停止容器
echo "[2/5] 停止容器..."
docker compose -f $COMPOSE_FILE down

# 3. 重新构建并启动
echo "[3/5] 构建并启动容器..."
docker compose -f $COMPOSE_FILE up -d --build

# 4. 等待服务启动
echo "[4/5] 等待服务启动..."
sleep 15

# 5. 检查状态
echo "[5/5] 检查服务状态..."
docker compose -f $COMPOSE_FILE ps

echo "=========================================="
echo "部署完成!"
echo "Backend: http://162.0.214.180:9000"
echo "Storefront: http://162.0.214.180:3000"
echo "Seller Dashboard: http://162.0.214.180:5173"
echo "=========================================="
