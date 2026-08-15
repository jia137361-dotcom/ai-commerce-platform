import path from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync, readFileSync } from "node:fs"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { Pool } from "pg"
import dotenv from "dotenv"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(rootDir, "../medusa-backend/.env") })
const sellerEnvPath = path.join(rootDir, ".env")
const sellerEnv = existsSync(sellerEnvPath) ? dotenv.parse(readFileSync(sellerEnvPath)) : {}

const localProductApi = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  return {
    name: "local-product-api",
    configureServer(server: { middlewares: { use: (path: string, handler: Function) => void } }) {
      const adminEmail = sellerEnv.LOCAL_DEV_ADMIN_EMAIL
      const adminPassword = sellerEnv.LOCAL_DEV_ADMIN_PASSWORD
      server.middlewares.use("/local-api/auth/user/emailpass", async (req: any, res: any) => {
        let raw = ""
        req.on("data", (chunk: Buffer) => { raw += chunk.toString() })
        req.on("end", () => {
          const body = JSON.parse(raw || "{}")
          if (body.email === adminEmail && body.password === adminPassword) {
            res.setHeader("Content-Type", "application/json")
            return res.end(JSON.stringify({ token: "local-platform-admin" }))
          }
          res.statusCode = 401
          res.end(JSON.stringify({ message: "Invalid administrator credentials" }))
        })
      })
      server.middlewares.use("/local-api/seller/session", (req: any, res: any) => {
        if (req.headers.authorization !== "Bearer local-platform-admin") {
          res.statusCode = 401
          return res.end(JSON.stringify({ error: { message: "Unauthorized" } }))
        }
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ session: { user_id: "local-platform-admin", email: adminEmail, first_name: "Platform", last_name: "Admin", store_id: "01KXCZMXT8DSCSMBS0ZC69J12E", store_name: "CitiGoo" } }))
      })
      server.middlewares.use("/local-api/admin/skus", async (req: any, res: any) => {
        try {
          const url = new URL(req.url, "http://localhost")
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100)
          const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0)
          const productId = url.searchParams.get("product_id")
          const values: unknown[] = ["01KXCZMXT8DSCSMBS0ZC69J12E"]
          const productFilter = productId ? ` and p.id=$2` : ""
          if (productId) values.push(productId)
          const limitIndex = values.push(limit)
          const offsetIndex = values.push(offset)
          const result = await pool.query(`select p.id product_id,p.title product_title,p.status product_status,p.image_url,coalesce(v.value->>'platform_sku',v.value->>'sku', concat('CG-',p.basic_product_id,'-',v.value->>'supplier_variant_id')) platform_sku,v.value->>'sku' supplier_sku,v.value->>'supplier_variant_id' supplier_variant_id,v.value->>'supplier_external_variant_id' supplier_external_variant_id,p.supplier_product_id,v.value->>'color' color,v.value->>'size' size,(v.value->>'cost')::numeric cost,(v.value->>'price')::numeric default_price,(v.value->>'price_override')::numeric price_override,coalesce((v.value->>'enabled')::boolean,true) enabled,v.value->>'warehouse_name' warehouse_name,v.value->>'ship_from_country' ship_from_country from mc_product p cross join lateral jsonb_array_elements(p.variants) v(value) where p.store_id=$1${productFilter} order by p.updated_at desc limit $${limitIndex} offset $${offsetIndex}`, values)
          const count = await pool.query(`select coalesce(sum(jsonb_array_length(variants)),0)::int count from mc_product p where p.store_id=$1${productFilter}`, values.slice(0, productId ? 2 : 1))
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ count: count.rows[0].count, limit, offset, skus: result.rows.map((sku: any) => ({ ...sku, sku_id: `${sku.product_id}:${sku.supplier_variant_id}`, final_price: sku.price_override ?? sku.default_price })) }))
        } catch (error: any) { res.statusCode = 500; res.end(JSON.stringify({ error: { message: error.message || "SKU query failed" } })) }
      })
      server.middlewares.use("/local-api/admin/store-products/", async (req: any, res: any, next: () => void) => {
        try {
          const productId = decodeURIComponent(String(req.url || "").split("?")[0]).replace(/^\//, "")
          if (!productId) return next()
          const product = await pool.query(
            `select p.id as product_id, p.store_id, p.title, coalesce(nullif(p.description,''), sp.raw_json->>'en_desc') as description, p.status, p.source, p.ai_job_id, p.prompt, p.supplier_id, p.platform_product_id, p.basic_product_id, p.supplier_product_id, p.supplier_variant_id, p.supplier_material_id, p.supplier_size_id, p.supplier_color_id, p.view_id, p.design_type, p.ship_from_country, p.medusa_product_id, p.medusa_variant_id, p.design_image_url, p.mockup_image_url, p.print_file_url, p.image_url, p.tags, p.price, p.cost, p.variants, p.category_ids, p.metadata, p.created_at, p.updated_at from mc_product p left join mc_supplier_product sp on sp.id=p.supplier_product_id where p.id=$1 and p.store_id='01KXCZMXT8DSCSMBS0ZC69J12E'`,
            [productId],
          )
          if (!product.rows[0]) { res.statusCode = 404; return res.end(JSON.stringify({ error: { message: "Product not found" } })) }
          const row = product.rows[0]
          const supplier = row.supplier_product_id ? await pool.query(
            `select id, supplier_id, supplier_product_id, basic_product_id, basic_product_en_name, warehouse_name, produce_country, deliver_goods_text, raw_json from mc_supplier_product where id=$1`, [row.supplier_product_id]
          ) : { rows: [] }
          const supplierRow = supplier.rows[0]
          const variants = supplierRow ? await pool.query(`select id as supplier_variant_id, supplier_variant_id as external_supplier_variant_id, supplier_size_id, supplier_color_id, color, size, color_name, size_name, sku, cost, weight, length, width, height from mc_supplier_product_variant where supplier_product_id=$1`, [supplierRow.id]) : { rows: [] }
          const specs = supplierRow ? await pool.query(`select id as print_spec_id, view_id, view_name, view_en_name, print_position, print_file_width, print_file_height, dpi from mc_supplier_print_spec where supplier_product_id=$1`, [supplierRow.id]) : { rows: [] }
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ product_id: row.product_id, store_id: row.store_id, product: { ...row, variants: Array.isArray(row.variants) ? row.variants : [], category_ids: Array.isArray(row.category_ids) ? row.category_ids : [], tags: Array.isArray(row.tags) ? row.tags : [], supplier_details: supplierRow ? { ...supplierRow, variants: variants.rows, print_specs: specs.rows } : null } }))
        } catch (error: any) { res.statusCode = 500; res.end(JSON.stringify({ error: { message: error.message || "Database detail query failed" } })) }
      })
      server.middlewares.use("/local-api/admin/store-products", async (req: any, res: any) => {
        try {
          const url = new URL(req.url, "http://localhost")
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100)
          const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0)
          const status = url.searchParams.get("status") || "all"
          const search = url.searchParams.get("q")?.trim() || ""
          // CitiGoo currently operates a single seller store. Ignore stale browser
          // store IDs left by older multi-store development sessions.
          const storeId = "01KXCZMXT8DSCSMBS0ZC69J12E"
          const where = ["store_id=$1"]
          const values: unknown[] = [storeId]
          if (status !== "all") { values.push(status); where.push(`status=$${values.length}`) }
          if (search) { values.push(`%${search}%`); where.push(`title ilike $${values.length}`) }
          const clause = where.join(" and ")
          values.push(limit, offset)
          const [items, total] = await Promise.all([
            // List pages deliberately avoid the large supplier raw payload and the
            // 14k-variant JSON collection. Detail/edit views load those on demand.
            pool.query(`select id as product_id, store_id, title, status, source, supplier_id, basic_product_id, supplier_product_id, image_url, mockup_image_url, design_image_url, price, cost, ship_from_country, tags, coalesce(metadata - 'supplier_details', '{}'::jsonb) as metadata, created_at, updated_at from mc_product where ${clause} order by updated_at desc limit $${values.length - 1} offset $${values.length}`, values),
            pool.query(`select count(*)::int count from mc_product where ${clause}`, values.slice(0, -2)),
          ])
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ store_id: storeId, count: total.rows[0].count, limit, offset, products: items.rows }))
        } catch (error: any) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: { message: error.message || "Database query failed" } }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localProductApi()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.join(rootDir, "node_modules/react"),
      "react-dom": path.join(rootDir, "node_modules/react-dom"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
})
