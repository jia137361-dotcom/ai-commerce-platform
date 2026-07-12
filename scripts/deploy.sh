#!/bin/bash
# =============================================================================
# CitiGoo 一键部署脚本
# 用法: ./scripts/deploy.sh [环境变量文件]
# 示例: ./scripts/deploy.sh .env.prod
# =============================================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}==== $1 ====${NC}"; }

# 配置
ENV_FILE="${1:-.env.prod}"
COMPOSE_FILE="infra/docker-compose.prod.yml"

# 检查
command -v docker >/dev/null 2>&1 || error "需要安装 docker"
docker compose version >/dev/null 2>&1 || error "需要安装 docker compose plugin"

if [ ! -f "$ENV_FILE" ]; then
    error "环境变量文件 $ENV_FILE 不存在"
fi

echo -e "${BLUE}"
echo "=========================================="
echo "     CitiGoo 生产环境部署"
echo "=========================================="
echo -e "${NC}"

# 加载环境变量
set -a
source "$ENV_FILE"
set +a

# 1. 停止旧服务
step "1/7 停止旧服务"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true
info "旧服务已停止"

# 2. 构建镜像
step "2/7 构建 Docker 镜像"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
info "镜像构建完成"

# 3. 启动数据库
step "3/7 启动 PostgreSQL 和 Redis"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

echo -n "   等待 PostgreSQL 就绪"
for i in {1..30}; do
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-citigoo}" > /dev/null 2>&1; then
        echo ""
        info "PostgreSQL 已就绪"
        break
    fi
    echo -n "."
    sleep 2
done

# 4. 启动后端
step "4/7 启动 Medusa 后端"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d medusa-backend

echo -n "   等待 Medusa 就绪"
for i in {1..30}; do
    if curl -s "http://localhost:${MEDUSA_PORT:-9000}/health" > /dev/null 2>&1; then
        echo ""
        info "Medusa 后端已就绪"
        break
    fi
    echo -n "."
    sleep 3
done

# 5. 运行数据库迁移
step "5/7 运行数据库迁移"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T medusa-backend \
    npx medusa db:migrate
info "数据库迁移完成"

# 6. 导入种子数据
step "6/7 导入种子数据"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T medusa-backend \
    npx medusa exec ./src/scripts/seed.ts
info "种子数据导入完成"

# 7. 启动所有服务
step "7/7 启动所有服务"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
info "所有服务已启动"

# 验证
echo ""
step "部署验证"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo -e "${GREEN}=========================================="
echo "     部署完成！"
echo "==========================================${NC}"
echo ""
echo "服务访问地址："
echo "  后端 API:     http://localhost:${MEDUSA_PORT:-9000}"
echo "  AI Worker:    http://localhost:${AI_WORKER_PORT:-8001}"
echo "  买家店面:     http://localhost:${STOREFRONT_PORT:-3000}"
echo "  卖家仪表盘:   http://localhost:${SELLER_PORT:-5173}"
echo ""
echo "查看日志："
echo "  docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "下一步：导入 S2BDIY 产品目录"
echo "  docker compose -f $COMPOSE_FILE exec medusa-backend npx medusa exec ./src/scripts/import-s2bdiy-catalog.ts"
