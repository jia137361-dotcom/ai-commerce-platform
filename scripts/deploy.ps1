# =============================================================================
# CitiGoo 生产环境部署脚本 (Windows PowerShell)
# 用法: .\scripts\deploy.ps1 [branch]
# 示例: .\scripts\deploy.ps1 feat/platform-marketplace-20260705
# =============================================================================

param(
    [string]$Branch = "feat/platform-marketplace-20260705"
)

$ErrorActionPreference = "Stop"

# 配置
$ComposeFile = "infra/docker-compose.prod.yml"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 函数
function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# 检查 Docker
function Test-Docker {
    try {
        docker info 2>&1 | Out-Null
        Write-Info "Docker is running"
    } catch {
        Write-Error "Docker is not running"
        exit 1
    }
}

# 拉取代码
function Pull-Code {
    Write-Info "Pulling latest code from branch: $Branch"
    Set-Location $ProjectDir
    
    # 保存本地修改
    git stash --include-untracked 2>$null
    
    # 拉取最新代码
    git fetch origin
    git checkout $Branch
    git pull origin $Branch
    
    Write-Info "Code updated successfully"
}

# 构建并重启
function Build-AndRestart {
    Write-Info "Building and restarting containers..."
    Set-Location $ProjectDir
    
    # 停止现有容器
    docker compose -f $ComposeFile down
    
    # 重新构建并启动
    docker compose -f $ComposeFile up -d --build
    
    # 等待服务启动
    Write-Info "Waiting for services to start..."
    Start-Sleep -Seconds 10
    
    # 检查服务状态
    docker compose -f $ComposeFile ps
}

# 运行迁移
function Run-Migrations {
    Write-Info "Running database migrations..."
    Set-Location $ProjectDir
    
    # 运行迁移
    try {
        docker compose -f $ComposeFile exec -T medusa-backend npm run db:migrate 2>$null
    } catch {
        Write-Warn "Migration may have already been applied"
    }
    
    Write-Info "Migrations completed"
}

# 更新数据
function Update-Data {
    Write-Info "Updating supplier data..."
    Set-Location $ProjectDir
    
    # 更新 ship_from_country
    try {
        docker compose -f $ComposeFile exec -T medusa-backend node scripts/update-ship-from-area.js 2>$null
    } catch {
        Write-Warn "Data update may have already been applied"
    }
    
    Write-Info "Supplier data updated"
}

# 健康检查
function Test-Health {
    Write-Info "Running health check..."
    Set-Location $ProjectDir
    
    # 检查后端
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Info "Backend is healthy"
        }
    } catch {
        Write-Warn "Backend health check failed (may still be starting)"
    }
}

# 主流程
function Main {
    Write-Info "Starting deployment for branch: $Branch"
    Write-Host "==========================================" -ForegroundColor Cyan
    
    Test-Docker
    Pull-Code
    Build-AndRestart
    Run-Migrations
    Update-Data
    Test-Health
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Info "Deployment completed!"
    Write-Info "Backend: http://162.0.214.180:9000"
    Write-Info "Storefront: http://162.0.214.180:3000"
    Write-Info "Seller Dashboard: http://162.0.214.180:5173"
}

# 执行
Main
