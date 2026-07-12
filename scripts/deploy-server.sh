#!/bin/bash
# =============================================================================
# CitiGoo 一键部署脚本 - 复制到服务器执行
# =============================================================================

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║         CitiGoo 一键部署                         ║"
echo "╚══════════════════════════════════════════════════╝"

PROJECT_DIR="/opt/ai-commerce-platform"

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    echo "cd $PROJECT_DIR"
    exit 1
fi

# 1. 安装 Docker
echo ""
echo "[1/7] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
    echo "✓ Docker 已安装"
else
    echo "✓ Docker 已存在"
fi

# 2. 检查 Docker Compose
echo ""
echo "[2/7] 检查 Docker Compose..."
if ! docker compose version &> /dev/null; then
    echo "安装 Docker Compose..."
    apt-get update && apt-get install -y docker-compose-plugin
fi
echo "✓ Docker Compose 已就绪"

# 3. 配置环境变量
echo ""
echo "[3/7] 配置环境变量..."
if [ ! -f ".env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    COOKIE_SECRET=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    cat > .env << EOF
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

# Stripe
PUBLISHABLE_API_KEY=pk_test_placeholder
STRIPE_API_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=

# AI Worker
AI_WORKER_PORT=8001
AI_WORKER_MOCK_GENERATION=true
AI_WORKER_PUBLIC_BASE_URL=http://localhost:8001/static
MEDUSA_BASE_URL=http://localhost:9000

# 图像生成
IMAGE_GEN_PROVIDER=dashscope
DASHSCOPE_API_KEY=
DEEPSEEK_API_KEY=

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

    echo ""
    echo "=========================================="
    echo " 重要：请保存以下密码"
    echo "=========================================="
    echo " 数据库密码: $POSTGRES_PASSWORD"
    echo " JWT 密钥: $JWT_SECRET"
    echo " Cookie 密钥: $COOKIE_SECRET"
    echo "=========================================="
    echo ""
    echo "请将这些密码保存到安全的地方！"
    echo "配置文件位置: $PROJECT_DIR/.env"
else
    echo "✓ .env 文件已存在"
fi

# 4. 构建 Docker 镜像
echo ""
echo "[4/7] 构建 Docker 镜像..."
docker compose -f infra/docker-compose.prod.yml --env-file .env build

# 5. 启动数据库
echo ""
echo "[5/7] 启动数据库..."
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d postgres redis

echo -n "等待 PostgreSQL 就绪"
for i in {1..30}; do
    if docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T postgres pg_isready -U citigoo > /dev/null 2>&1; then
        echo ""
        echo "✓ PostgreSQL 已就绪"
        break
    fi
    echo -n "."
    sleep 2
done

# 6. 运行数据库迁移
echo ""
echo "[6/7] 运行数据库迁移..."

# 启动后端
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d medusa-backend

echo -n "等待 Medusa 就绪"
for i in {1..30}; do
    if curl -s "http://localhost:9000/health" > /dev/null 2>&1; then
        echo ""
        echo "✓ Medusa 后端已就绪"
        break
    fi
    echo -n "."
    sleep 3
done

# 运行迁移
docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T medusa-backend \
    npx medusa db:migrate

# 导入种子数据
docker compose -f infra/docker-compose.prod.yml --env-file .env exec -T medusa-backend \
    npx medusa exec ./src/scripts/seed.ts

echo "✓ 数据库迁移完成"

# 7. 启动所有服务
echo ""
echo "[7/7] 启动所有服务..."
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d

# 验证
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              部署完成！                           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "服务状态:"
docker compose -f infra/docker-compose.prod.yml --env-file .env ps
echo ""

IP=$(hostname -I | awk '{print $1}')
echo "访问地址:"
echo "  后端 API:     http://$IP:9000"
echo "  AI Worker:    http://$IP:8001"
echo "  买家店面:     http://$IP:3000"
echo "  卖家仪表盘:   http://$IP:5173"
echo ""
echo "常用命令:"
echo "  查看日志:     docker compose -f infra/docker-compose.prod.yml logs -f"
echo "  重启服务:     docker compose -f infra/docker-compose.prod.yml restart"
echo "  停止服务:     docker compose -f infra/docker-compose.prod.yml down"
