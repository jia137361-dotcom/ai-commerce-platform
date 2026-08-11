# 支付全链路测试交接（分支 `ciiverse_0714`）

日期：2026-07-28  
对接人：支付全链路测试搭档  
本分支负责人：当前 storefront / seller / coupons / followers / plans 相关改动

---

## 1. 先确认：删掉的两个 `.mjs` 不影响使用

已删除（仅一次性本地修库脚本）：

- `fix-user-ids.mjs`
- `verify-fix.mjs`

**不影响** `npm run dev:all`、买家店、卖家后台、结账、Stripe。  
它们不在 `package.json` scripts 里，也没有任何代码 import。

同批还可忽略的删除：若干 `debug-*.mjs`（同样是临时调试脚本）。

---

## 2. 分支对照（上传前）

| 项 | 值 |
|----|----|
| 当前分支 | `ciiverse_0714` |
| 跟踪远程 | `origin/ciiverse_0714` |
| 相对远程 | 本地有大量 **未提交** 改动（push 前需先 commit） |

相对 `origin/ciiverse_0714` 的工作区大致包含：

### 买家 storefront（支付相关会碰到）
- 结账：优惠券选券、运费展示/合计、Order again 回结账等
- 顶栏：统一 Shop / AI Design / Studio / How it works / Saved / Search（**已去掉全站底栏**）
- Plans / My coupons / Saved / Search / Categories 等新页

### 后端
- **优惠券模块** `store_coupons`（需迁移）
- 买家 plan（metadata demo，**不是** Stripe Subscription）
- Followers admin API
- 结账 complete 写入优惠券/折扣 metadata
- S2B 同步：**跳过** `mock_s2b_*` 假单号（避免对真实 S2B 打 400）

### 卖家
- Coupons 发券页；Followers 人数 + 列表
- 导航去掉 Categories / Suppliers（路由仍可直达）

---

## 3. 支付搭档：启动前必做

```bash
cd ai-commerce-platform
npm run db:migrate    # 必须：建 store_coupon / buyer_coupon，否则发券/选券会挂
npm run dev:all       # backend :9000 / seller :5173 / storefront :5174 / ai :8001
```

环境变量（只写变量名，密钥各自本地配置，勿提交）：

| 位置 | 变量 |
|------|------|
| `apps/medusa-backend/.env` | `STRIPE_API_KEY=sk_test_...`、`STRIPE_WEBHOOK_SECRET=whsec_...` |
| `apps/storefront/.env` 或 `.env.local` | `VITE_STRIPE_PK=pk_test_...` |

可选：启用区域 Stripe provider

```bash
npm --workspace apps/medusa-backend run stripe:region:setup
```

Webhook（测真实 Stripe 回写时）：

```bash
stripe listen \
  --events payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.payment_failed \
  --forward-to localhost:9000/hooks/payment/stripe_stripe
```

把 CLI 生成的 `whsec_...` 写入 backend `.env` 后重启 backend。

更细的历史说明见：[`pay-stripe-01.md`](./pay-stripe-01.md)。

---

## 4. 建议手测路径（支付全链路）

1. 买家登录 → `/store` 选空白品 → Design / 加购 → `/cart` → `/checkout`
2. 填地址 → 选运费 → 支付方式：
   - **Stripe test**：卡号 `4242 4242 4242 4242`，任意未来有效期 / CVC
   - 本地也可试 `pp_system_default`（非 Stripe，适合跳过外网慢）
3. 完成下单 → `/checkout/success` → `/account/orders` → 订单详情
4. （可选）卖家 `/orders` 看单；注意 mock 供应商单号不会再对 S2B 假同步报错

### 与支付交叉、建议顺带点一下
- 结账选 **优惠券**（买家先开 `/account/coupons`；默认券会自动进钱包；独家券靠兑换码）
- 合计：商品 − 券 − plan% + 运费（若有）

### 不要当成 Stripe 订阅测的
- `/plans` 升级目前是 **metadata demo**，不会产生 Stripe Subscription / 扣月费

---

## 5. 自动化脚本（可选）

```bash
# 准备隔离测试账号/商品（需 PAY_STRIPE_E2E_SETUP=true）
PAY_STRIPE_E2E_SETUP=true npm --workspace apps/medusa-backend run pay-stripe:e2e:setup

# HTTP smoke（需 PAY_STRIPE_TEST_PASSWORD）
PAY_STRIPE_TEST_PASSWORD='...' npm --workspace apps/medusa-backend run pay-stripe:http-smoke
```

---

## 6. 已知注意点

| 点 | 说明 |
|----|------|
| 目录商品来源 | 首页仍直拉 `sup_s2bdiy`；搭档筛选商品 API 未接 |
| China → Stripe | `api.stripe.com` / `js.stripe.com` 可能慢；可用 system default 做非 Stripe 通路 |
| mock 供应商单 | `mock_s2b_*` 已跳过远程 sync；终端不应再刷 getFillable 400 |
| 优惠券表 | 未 migrate 时卖家 Create coupon 会报 `store_coupon does not exist` |
| 文档 | `docs/` 整夹保留；以本交接 + `pay-stripe-01.md` 为准测支付 |

---

## 7. 上传分支前自检（负责人）

- [ ] `npm run db:migrate` 已在本机跑过
- [ ] `npm --workspace apps/storefront run build` 通过
- [ ] 未把 `.env` / 密钥打进 commit
- [ ] 确认要提交的文件列表（尤其未跟踪的 coupons / followers / plans）
- [ ] commit 后 `git push -u origin HEAD`（或按团队流程开 PR）

旧冒烟清单可参考：[`seller-buyer-merge-smoke-checklist.md`](./seller-buyer-merge-smoke-checklist.md)（分支名已过时，端口与检查项仍可用）。
