#!/bin/bash
# =============================================================================
# 快速部署脚本 - 复制粘贴到服务器执行
# =============================================================================

echo "╔══════════════════════════════════════════════════╗"
echo "║         CitiGoo 快速部署                         ║"
echo "╚══════════════════════════════════════════════════╝"

# 1. 安装 Docker
echo "[1/5] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi
echo "✓ Docker 已就绪"

# 2. 创建项目目录
echo "[2/5] 准备项目..."
mkdir -p /opt/ai-commerce-platform
cd /opt/ai-commerce-platform

# 3. 创建 docker-compose.prod.yml
echo "[3/5] 创建配置文件..."
cat > docker-compose.prod.yml << 'COMPOSE_EOF'
services:
  postgres:
    image: postgres:16
    container_name: citigoo-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: citigoo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: citigoo_prod
    ports:
      - "5432:5432"
    volumes:
      - citigoo-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U citigoo"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: citigoo-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  medusa-backend:
    build:
      context: .
      dockerfile: Dockerfile.medusa
    container_name: citigoo-medusa
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://citigoo:${POSTGRES_PASSWORD}@postgres:5432/citigoo_prod
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - COOKIE_SECRET=${COOKIE_SECRET}
      - STORE_CORS=${STORE_CORS:-http://localhost:3000,http://localhost:5173}
      - ADMIN_CORS=${ADMIN_CORS:-http://localhost:5173}
      - AUTH_CORS=${AUTH_CORS:-http://localhost:3000,http://localhost:5173}
      - MEDUSA_BACKEND_URL=http://localhost:9000
      - DEFAULT_STORE_ID=default_store
      - PUBLISHABLE_API_KEY=${PUBLISHABLE_API_KEY}
      - STRIPE_API_KEY=${STRIPE_API_KEY}
      - AI_WORKER_BASE_URL=http://ai-worker:8001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  ai-worker:
    build:
      context: .
      dockerfile: Dockerfile.ai-worker
    container_name: citigoo-ai-worker
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - AI_WORKER_HOST=0.0.0.0
      - AI_WORKER_PORT=8001
      - AI_WORKER_MOCK_GENERATION=true
      - MEDUSA_BASE_URL=http://medusa-backend:9000

volumes:
  citigoo-postgres:
COMPOSE_EOF

# 4. 创建 Medusa Dockerfile
cat > Dockerfile.medusa << 'DOCKERFILE_EOF'
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 9000
CMD ["npm", "start"]
DOCKERFILE_EOF

# 5. 创建 AI Worker Dockerfile
cat > Dockerfile.ai-worker << 'DOCKERFILE_EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
DOCKERFILE_EOF

echo "✓ 配置文件已创建"

# 6. 创建 .env 文件
echo "[4/5] 创建环境变量..."
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    COOKIE_SECRET=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    cat > .env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
PUBLISHABLE_API_KEY=pk_test_placeholder
STRIPE_API_KEY=sk_test_placeholder
STORE_CORS=http://localhost:3000,http://localhost:5173
ADMIN_CORS=http://localhost:5173
AUTH_CORS=http://localhost:3000,http://localhost:5173
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
fi

# 7. 构建并启动
echo "[5/5] 构建并启动服务..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              部署完成！                           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "服务状态:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "访问地址:"
IP=$(hostname -I | awk '{print $1}')
echo " 后端 API: http://$IP:9000"
echo " AI Worker: http://$IP:8001"
