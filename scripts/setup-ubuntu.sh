#!/bin/bash
# =============================================================================
# CitiGoo Ubuntu 服务器部署脚本
# 在 Ubuntu 服务器上运行: bash setup-ubuntu.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║         CitiGoo Ubuntu 部署脚本                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# 项目配置
PROJECT_DIR="/opt/ai-commerce-platform"
REPO_URL="https://github.com/your-org/ai-commerce-platform.git"  # 修改为你的仓库地址

# =============================================================================
# 步骤 1: 更新系统
# =============================================================================
step "步骤 1/8: 更新系统"
sudo apt update -y
sudo apt upgrade -y
info "系统已更新"

# =============================================================================
# 步骤 2: 安装 Docker
# =============================================================================
step "步骤 2/8: 安装 Docker"

if command -v docker &> /dev/null; then
    info "Docker 已安装"
else
    info "安装 Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo systemctl start docker
    sudo systemctl enable docker
    info "Docker 安装完成"
fi

# 安装 Docker Compose 插件
if docker compose version &> /dev/null; then
    info "Docker Compose 已安装"
else
    info "安装 Docker Compose..."
    sudo apt install docker-compose-plugin -y
    info "Docker Compose 安装完成"
fi

# 验证
docker --version
docker compose version

# =============================================================================
# 步骤 3: 克隆代码
# =============================================================================
step "步骤 3/8: 克隆代码"

if [ -d "$PROJECT_DIR" ]; then
    info "项目目录已存在，拉取最新代码"
    cd "$PROJECT_DIR"
    sudo git pull
else
    info "克隆代码..."
    sudo git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi
info "代码已就绪"

# =============================================================================
# 步骤 4: 配置环境变量
# =============================================================================
step "步骤 4/8: 配置环境变量"

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    info ".env 文件已存在"
else
    info "创建 .env 文件..."

    # 生成随机密钥
    JWT_SECRET=$(openssl rand -hex 32)
    COOKIE_SECRET=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    cat > "$ENV_FILE" << EOF
# =============================================================================
# CitiGoo 生产环境配置
# =============================================================================

# 数据库
POSTGRES_USER=citigoo
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=citigoo_prod
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Medusa 后端
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
STORE_CORS=http://localhost:3000,http://localhost:5173
ADMIN_CORS=http://localhost:5173
AUTH_CORS=http://localhost:3000,http://localhost:5173
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_PORT=9000
DEFAULT_STORE_ID=default_store

# Stripe (测试密钥)
PUBLISHABLE_API_KEY=pk_test_51234567890
STRIPE_API_KEY=sk_test_51234567890
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890

# AI Worker
AI_WORKER_PORT=8001
AI_WORKER_MOCK_GENERATION=true
AI_WORKER_PUBLIC_BASE_URL=http://localhost:8001/static

# 图像生成
IMAGE_GEN_PROVIDER=dashscope
DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com
DASHSCOPE_IMAGE_MODEL=wan2.7-image-pro

# DeepSeek
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com

# S2BDIY
S2BDIY_MOCK_MODE=true
S2BDIY_API_BASE_URL=https://opentest.s2bdiy.com
S2BDIY_APP_KEY=wm001
S2BDIY_APP_SECRET=test_secret
S2BDIY_PLATFORM_ID=99
S2BDIY_STORE_ID=4390

# 前端
STOREFRONT_PORT=3000
SELLER_PORT=5173
VITE_API_URL=http://localhost:9000
EOF

    info ".env 文件已创建"
    echo ""
    echo -e "${YELLOW}重要：请记录以下密码：${NC}"
    echo "  数据库密码: $POSTGRES_PASSWORD"
    echo "  JWT 密钥: $JWT_SECRET"
    echo "  Cookie 密钥: $COOKIE_SECRET"
    echo ""
fi

# =============================================================================
# 步骤 5: 构建 Docker 镜像
# =============================================================================
step "步骤 5/8: 构建 Docker 镜像"
cd "$PROJECT_DIR"
docker compose -f infra/docker-compose.prod.yml --env-file .env build --no-cache
info "镜像构建完成"

# =============================================================================
# 步骤 6: 启动数据库
# =============================================================================
step "步骤 6/8: 启动 PostgreSQL 和 Redis"
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d postgres redis

echo -n "等待 PostgreSQL 就绪"
for i in {1..30}; do
    if docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T postgres pg_isready -U citigoo > /dev/null 2>&1; then
        echo ""
        info "PostgreSQL 已就绪"
        break
    fi
    echo -n "."
    sleep 2
done

# =============================================================================
# 步骤 7: 运行数据库迁移
# =============================================================================
step "步骤 7/8: 运行数据库迁移"

# 启动后端
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d medusa-backend

echo -n "等待 Medusa 就绪"
for i in {1..30}; do
    if curl -s "http://localhost:9000/health" > /dev/null 2>&1; then
        echo ""
        info "Medusa 后端已就绪"
        break
    fi
    echo -n "."
    sleep 3
done

# 运行迁移
docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T medusa-backend \
    npx medusa db:migrate
info "数据库迁移完成"

# 导入种子数据
docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T medusa-backend \
    npx medusa exec ./src/scripts/seed.ts
info "种子数据导入完成"

# =============================================================================
# 步骤 8: 启动所有服务
# =============================================================================
step "步骤 8/8: 启动所有服务"
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d
info "所有服务已启动"

# =============================================================================
# 验证部署
# =============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗"
echo "║              部署完成！                           ║"
echo "╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "服务状态："
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
echo ""
echo "访问地址："
echo "  后端 API:     http://$(hostname -I | awk '{print $1}'):9000"
echo "  AI Worker:    http://$(hostname -I | awk '{print $1}'):8001"
echo "  买家店面:     http://$(hostname -I | awk '{print $1}'):3000"
echo "  卖家仪表盘:   http://$(hostname -I | awk '{print $1}'):5173"
echo ""
echo "常用命令："
echo "  查看日志:     docker compose -f infra/docker-compose.prod.yml logs -f"
echo "  重启服务:     docker compose -f infra/docker-compose.prod.yml restart"
echo "  停止服务:     docker compose -f infra/docker-compose.prod.yml down"
echo ""
echo "下一步：导入 S2BDIY 产品目录"
echo "  cd $PROJECT_DIR"
echo "  docker compose -f infra/docker-compose.prod.yml --env-file .env exec medusa-backend npx medusa exec ./src/scripts/import-s2bdiy-catalog.ts"
