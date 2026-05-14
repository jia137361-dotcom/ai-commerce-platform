# 团队 Git 提交流程

## Summary

本项目使用一个 GitHub 仓库协作。三个人分别在自己的 feature 分支开发，完成小功能后提交到自己的分支，再通过 PR 合并到 `develop`。

仓库地址：

```text
https://github.com/jia137361-dotcom/ai-commerce-platform.git
```

## Branch Rules

- `main`：稳定主分支，只放阶段性稳定版本。
- `develop`：日常集成分支，三个人的功能最终先合并到这里。
- `feature/store-product`：开发 1，商品、店铺、Store 模型。
- `feature/cart-payment-order`：开发 2，购物车、订单、Stripe 支付。
- `feature/store-context-testing`：开发 3，多店上下文、文档、测试、seed。

已经创建好的远程分支：

```text
origin/develop
origin/feature/store-product
origin/feature/cart-payment-order
origin/feature/store-context-testing
```

## 第一次拉代码

每个成员先执行：

```powershell
git clone https://github.com/jia137361-dotcom/ai-commerce-platform.git
cd ai-commerce-platform
git fetch origin
```

开发 1：

```powershell
git checkout feature/store-product
git pull origin feature/store-product
```

开发 2：

```powershell
git checkout feature/cart-payment-order
git pull origin feature/cart-payment-order
```

开发 3：

```powershell
git checkout feature/store-context-testing
git pull origin feature/store-context-testing
```

## 每天开始开发前

每个人都先把 `develop` 的最新代码合进自己的分支：

```powershell
git checkout develop
git pull origin develop

git checkout 自己的feature分支
git merge develop
```

开发 2 示例：

```powershell
git checkout develop
git pull origin develop

git checkout feature/cart-payment-order
git merge develop
```

## 提交代码到哪里

不要提交到 `main`，也不要直接提交到 `develop`。

每个人提交到自己的 feature 分支：

```powershell
git status
git add .
git commit -m "feat: add cart creation api"
git push origin 自己的feature分支
```

开发 1：

```powershell
git push origin feature/store-product
```

开发 2：

```powershell
git push origin feature/cart-payment-order
```

开发 3：

```powershell
git push origin feature/store-context-testing
```

## 怎么合并到 develop

每完成一个小功能，就在 GitHub 上开 PR：

```text
feature/store-product -> develop
feature/cart-payment-order -> develop
feature/store-context-testing -> develop
```

PR 不要太大，建议按小功能拆：

- stores 表/migration
- default_store seed
- product draft API
- product publish API
- cart 创建
- cart 加商品
- Stripe webhook
- store context 测试

每个 PR 至少写清楚：

- 做了什么
- 改了哪些接口
- 是否改了数据库/migration
- 怎么测试
- 是否影响别人

## 新功能短分支

已有三个 feature 分支够第一阶段使用。如果某个人要做一个独立大功能，可以从 `develop` 新建短分支：

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/product-tags
```

做完后推送并开 PR 回 `develop`：

```powershell
git push origin feature/product-tags
```

## develop 要保持可运行

合并到 `develop` 前必须确认：

- 项目能启动。
- 基本接口能跑。
- 不提交 `.env`、`node_modules`、本地说明文档。
- 如果改了数据库，必须提交 migration。
- 如果改了接口，必须更新对应文档或 PR 说明。
