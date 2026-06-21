# 合作伙伴本地交接指南（先本地，后上云）

把项目交给合作伙伴时，需要交接 **三样东西**：代码、数据库快照、环境配置（私密通道）。  
仅 push GitHub **不够**——admin 账号、商品、Publishable Key 都在 Postgres 里。

---

## 你（导出方）现在要做的事

### 1. 推送代码到 GitHub

```bash
cd ai-commerce-platform
git status                    # 确认没有 .env
git add .
git commit -m "你的提交说明"
git push -u origin integrate/seller-buyer   # 或你们约定的分支
```

把仓库地址和分支名发给对方：

```text
https://github.com/jia137361-dotcom/ai-commerce-platform.git
分支：integrate/seller-buyer（以实际为准）
```

### 2. 导出数据库快照

确保 Docker Postgres 在运行：

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
bash scripts/partner-export-db.sh
```

会在 `exports/` 下生成 `ai_commerce-YYYYMMDD-HHMMSS.dump`（约几十 MB～几百 MB）。

**通过私密方式发给对方**（微信文件、网盘私密链接、1Password），**不要**上传到 GitHub。

### 3. 私密发送环境配置清单

复制 `apps/medusa-backend/.env.example` 为参考，把下面变量**真实值**单独发给对方（不要进 Git）：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` / `COOKIE_SECRET` | 必须与导出库一致，否则已有 session 异常 |
| `PUBLISHABLE_API_KEY` | 买家店 `storefront/.env.local` 必填 |
| `ADMIN_EMAIL` / 密码 | 卖家后台登录（已在数据库里，告知对方即可） |
| `S2BDIY_*` / `FAL_KEY` 等 | 若需要真实供应商/AI，一并提供；本地 demo 可 `S2BDIY_MOCK_MODE=true` |

快速查看 Publishable Key（Postgres 在跑时）：

```bash
docker exec ai-commerce-postgres psql -U medusa -d ai_commerce -c \
  "select token from api_key where type = 'publishable' and revoked_at is null limit 1;"
```

### 4. 可选：打包交接物

```bash
bash scripts/partner-pack-handoff.sh
```

生成 `exports/handoff-YYYYMMDD/` 目录（含数据库 dump + 配置说明模板），整包私密发送。

---

## 合作伙伴（导入方）要做的事

### 1. 拉代码

```bash
git clone https://github.com/jia137361-dotcom/ai-commerce-platform.git
cd ai-commerce-platform
git checkout integrate/seller-buyer   # 与导出方确认分支
npm install
```

### 2. 启动 Postgres / Redis

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

### 3. 导入数据库

把收到的 `.dump` 放到项目 `exports/` 目录，然后：

```bash
bash scripts/partner-import-db.sh exports/ai_commerce-XXXXXXXX.dump
```

导入后**已包含** admin 用户、商品、订单、Publishable Key，**无需**再 `npx medusa user`。

### 4. 配置 .env（按导出方私发的值填写）

```bash
cp apps/medusa-backend/.env.example apps/medusa-backend/.env
cp apps/seller-dashboard/.env.example apps/seller-dashboard/.env
cp apps/storefront/.env.example apps/storefront/.env.local
```

重点：

- `apps/medusa-backend/.env` — `DATABASE_URL`、`JWT_SECRET`、`COOKIE_SECRET` 等与导出方一致
- `apps/storefront/.env.local` — `VITE_PUBLISHABLE_API_KEY=pk_...`（导出方提供）

### 5. 启动服务

```bash
# 终端 1：Medusa + 卖家后台
npm run dev:all

# 终端 2（可选）：AI Worker
cd apps/ai-worker && uvicorn app.main:app --port 8001

# 终端 3（可选）：买家店
npm --workspace apps/storefront run dev
```

| 服务 | 地址 |
|------|------|
| Medusa API | http://127.0.0.1:9000 |
| 卖家后台 | http://127.0.0.1:5173 |
| 买家店 | http://127.0.0.1:5174 |

### 6. 登录验证

- **卖家**：http://127.0.0.1:5173/login — 使用导出方提供的 admin 邮箱密码  
- **买家店**：需正确 `VITE_PUBLISHABLE_API_KEY`，否则 Store API 会 401

---

## 常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| Login failed | Medusa 未启动或 `.env` 数据库连错 | 检查 `:9000` 与 `DATABASE_URL` |
| 用你的账号登不了 | 未导入 dump，用的是空库 | 跑 `partner-import-db.sh` |
| 买家店 Failed to fetch | 缺 Publishable Key | 对齐 `storefront/.env.local` |
| 商品图打不开 | 图片 URL 指向导出方 `localhost:8001` | 本地起 ai-worker，或重新生成商品 |
| CORS 错误 | 前端端口不在 CORS 列表 | 在 medusa `.env` 的 `AUTH_CORS` 加上对方端口 |

---

## 之后上云（预留）

本地交接跑通后，再改为：

1. 云 Postgres + Redis（团队共用 `DATABASE_URL`）  
2. 一台 Dev Medusa（大家 `.env` 指向同一 API）  
3. 生产环境与 Dev 库隔离  

详见后续 `docs/cloud-dev-setup.md`（待写）。

---

## 安全提醒

- `exports/*.dump` 含用户与订单数据，**勿提交 Git**（已在 `.gitignore`）  
- `.env` 勿提交 GitHub  
- 演示/开发密码与生产密码分开  
