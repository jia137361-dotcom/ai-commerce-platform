# AI Commerce Platform — API Reference (开发 1: 商品 & 店铺)

Base URL: `http://localhost:9000`

## Store Context (多店隔离)

所有接口都通过 `resolveCurrentStore(req)` 获取当前店铺上下文，不写死单店。

解析优先级:
1. **Header**: `X-Store-Id: <store_id>`
2. **Host**: `localhost` 映射到 `DEFAULT_STORE_ID`
3. **Default**: 环境变量 `DEFAULT_STORE_ID`（默认 `default_store`）

调试接口: `GET /store-context`

---

## Admin 接口

### 店铺设置

#### `GET /admin/store-settings`

获取当前店铺的 settings。

**Response:**
```json
{
  "store_id": "default_store",
  "brand_name": "My Store",
  "logo_url": "...",
  "support_email": "help@example.com",
  "seo_title": "...",
  "seo_description": "...",
  "metadata": {}
}
```

#### `PUT /admin/store-settings`

创建或更新店铺设置（upsert）。

**Body:**
```json
{
  "brand_name": "My Store",
  "logo_url": "https://...",
  "support_email": "help@example.com",
  "seo_title": "My Store Title",
  "seo_description": "Store description for SEO",
  "metadata": {}
}
```

---

### 商品

#### `POST /admin/products/draft`

创建商品草稿。

**Body:**
```json
{
  "title": "Product Name",
  "description": "Optional description",
  "price": 99.00,
  "source": "manual",
  "image_url": "https://...",
  "design_image_url": "https://...",
  "tags": ["tag1", "tag2"],
  "category_ids": ["cat_abc", "cat_xyz"],
  "variants": [],
  "metadata": {}
}
```

**必填:** `title`, `price`

**Response:** `201 Created`
```json
{
  "product_id": "prod_xxx",
  "store_id": "default_store",
  "status": "draft",
  "product": {
    "product_id": "prod_xxx",
    "store_id": "default_store",
    "title": "Product Name",
    "status": "draft",
    "source": "manual",
    "tags": ["tag1", "tag2"],
    "category_ids": ["cat_abc", "cat_xyz"],
    "price": 99.00,
    "variants": [],
    "metadata": {},
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### `POST /admin/products/:product_id/publish`

发布商品草稿（draft → published）。

**Response:**
```json
{
  "product_id": "prod_xxx",
  "store_id": "default_store",
  "status": "published",
  "product": { ... }
}
```

---

### 商品分类

#### `POST /admin/product-categories`

创建商品分类。

**Body:**
```json
{
  "name": "T-Shirts",
  "description": "All t-shirt products",
  "parent_id": null,
  "sort_order": 0
}
```

**必填:** `name`（slug 自动生成）

**Response:** `201 Created`
```json
{
  "category_id": "cat_xxx",
  "store_id": "default_store",
  "category": {
    "category_id": "cat_xxx",
    "store_id": "default_store",
    "name": "T-Shirts",
    "slug": "t-shirts",
    "description": "All t-shirt products",
    "parent_id": null,
    "sort_order": 0,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### `GET /admin/product-categories`

获取当前店铺的所有分类。

**Response:**
```json
{
  "store_id": "default_store",
  "count": 2,
  "categories": [
    {
      "category_id": "cat_xxx",
      "store_id": "default_store",
      "name": "T-Shirts",
      "slug": "t-shirts",
      "description": "...",
      "parent_id": null,
      "sort_order": 0,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

## Store (前端/public) 接口

### `GET /store/products`

获取当前店铺已发布的商品列表。

**Response:**
```json
{
  "store_id": "default_store",
  "count": 1,
  "products": [
    {
      "product_id": "prod_xxx",
      "store_id": "default_store",
      "title": "Product Name",
      "status": "published",
      "price": 99.00,
      "category_ids": ["cat_abc"],
      "tags": ["tag1"],
      "...": "..."
    }
  ]
}
```

### `GET /store/products/:product_id`

获取单个已发布商品详情。

### `GET /store/settings`

获取当前店铺的公开设置。

### `GET /store/product-categories`

获取当前店铺的分类列表。

**Response:**
```json
{
  "store_id": "default_store",
  "count": 2,
  "categories": [
    {
      "category_id": "cat_xxx",
      "name": "T-Shirts",
      "slug": "t-shirts",
      "sort_order": 0
    }
  ]
}
```

---

## 错误响应格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required"
  }
}
```

错误码: `STORE_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `PRODUCT_STORE_MISMATCH`, `VALIDATION_ERROR`

---

## 多店测试

```shell
# 默认店铺
curl http://localhost:9000/store/products

# test_store 店铺
curl -H "X-Store-Id: test_store" http://localhost:9000/store/products
```
