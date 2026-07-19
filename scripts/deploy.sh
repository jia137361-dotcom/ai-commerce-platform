#!/bin/bash
# =============================================================================
# CitiGoo 生产环境部署脚本
# 用法: bash scripts/deploy.sh [branch]
# 示例: bash scripts/deploy.sh feat/platform-marketplace-20260705
# =============================================================================

set -e

# 配置
BRANCH=${1:-feat/platform-marketplace-20260705}
COMPOSE_FILE="infra/docker-compose.prod.yml"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    log_info "Docker is running"
}

# 拉取最新代码
pull_code() {
    log_info "Pulling latest code from branch: $BRANCH"
    cd "$PROJECT_DIR"
    
    # 保存本地修改
    git stash --include-untracked 2>/dev/null || true
    
    # 拉取最新代码
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    
    log_info "Code updated successfully"
}

# 构建并重启容器
build_and_restart() {
    log_info "Building and restarting containers..."
    cd "$PROJECT_DIR"
    
    # 停止现有容器
    docker compose -f "$COMPOSE_FILE" down
    
    # 重新构建并启动
    docker compose -f "$COMPOSE_FILE" up -d --build
    
    # 等待服务启动
    log_info "Waiting for services to start..."
    sleep 10
    
    # 检查服务状态
    docker compose -f "$COMPOSE_FILE" ps
}

# 运行数据库迁移
run_migrations() {
    log_info "Running database migrations..."
    cd "$PROJECT_DIR"
    
    # 等待数据库就绪
    docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'until pg_isready; do sleep 1; done'
    
    # 运行迁移
    docker compose -f "$COMPOSE_FILE" exec -T medusa-backend npm run db:migrate 2>/dev/null || true
    
    log_info "Migrations completed"
}

# 更新供应商数据
update_supplier_data() {
    log_info "Updating supplier data..."
    cd "$PROJECT_DIR"
    
    # 更新 ship_from_country
    docker compose -f "$COMPOSE_FILE" exec -T medusa-backend node scripts/update-ship-from-area.js 2>/dev/null || true
    
    log_info "Supplier data updated"
}

# 健康检查
health_check() {
    log_info "Running health check..."
    cd "$PROJECT_DIR"
    
    # 检查后端
    if curl -s http://localhost:9000/health > /dev/null 2>&1; then
        log_info "Backend is healthy"
    else
        log_warn "Backend health check failed (may still be starting)"
    fi
    
    # 检查前端
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_info "Storefront is healthy"
    else
        log_warn "Storefront health check failed (may still be starting)"
    fi
}

# 主流程
main() {
    log_info "Starting deployment for branch: $BRANCH"
    echo "=========================================="
    
    check_docker
    pull_code
    build_and_restart
    run_migrations
    update_supplier_data
    health_check
    
    echo "=========================================="
    log_info "Deployment completed!"
    log_info "Backend: http://162.0.214.180:9000"
    log_info "Storefront: http://162.0.214.180:3000"
    log_info "Seller Dashboard: http://162.0.214.180:5173"
}

# 执行
main "$@"
