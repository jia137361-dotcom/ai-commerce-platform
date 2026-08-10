import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { Pool } from "pg"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(__dirname, "../medusa-backend/.env") })
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })

const localStoreProducts = () => ({
  name: "local-store-products",
  configureServer(server: any) {
    server.middlewares.use("/store/products/", async (req: any, res: any, next: () => void) => {
      const segments = decodeURIComponent(String(req.url || "").split("?")[0])
        .split("/")
        .filter(Boolean)
      // Only provide the local fallback for GET /store/products/:id. Nested
      // routes such as /design-config must continue to the Medusa proxy.
      if (req.method !== "GET" || segments.length !== 1) return next()
      const [id] = segments
      try {
        const result = await pool.query(`select p.id product_id,p.store_id,p.title,coalesce(nullif(p.description,''),sp.raw_json->>'en_desc') description,p.status,p.image_url,p.mockup_image_url,p.design_image_url,p.price,p.variants,p.tags,p.metadata,sp.raw_json supplier_raw from mc_product p left join mc_supplier_product sp on sp.id=p.supplier_product_id where p.id=$1 and p.status='published'`, [id])
        const product = result.rows[0]
        if (!product) { res.statusCode=404; return res.end(JSON.stringify({ error: { message: "Product not found" } })) }
        const raw = product.supplier_raw || {}
        const collect = (value: any, out: string[] = []) => { if (Array.isArray(value)) value.forEach((item) => collect(item,out)); else if (typeof value === "string" && /^https?:/.test(value)) out.push(value); else if (value && typeof value === "object") { for (const key of ["src","big_src","image_src","url"]) if (typeof value[key] === "string" && /^https?:/.test(value[key])) out.push(value[key]); if (value.images) collect(value.images,out) }; return [...new Set(out)] }
        product.supplier_details = { english: { english_name: raw.en_name, english_description: raw.en_desc, images: collect(raw.product_show_images), blank_design_images: collect(raw.blank_design_images), colors: (raw.colors || []).map((x:any)=>({id:String(x.id),name:x.en_name||x.name})), sizes: (raw.sizes || []).map((x:any)=>({id:String(x.id),name:x.en_name||x.name})), views: (raw.views || []).map((x:any)=>({id:String(x.id),name:x.en_name||x.name})) } }
        res.setHeader("Content-Type","application/json"); res.end(JSON.stringify({ product }))
      } catch (error:any) { res.statusCode=500; res.end(JSON.stringify({error:{message:error.message}})) }
    })
  },
})

/** Browser navigations (Accept: text/html) must hit the SPA, not Medusa. */
const spaBypass = (req: { headers: { accept?: string } }) => {
  if (req.headers.accept?.includes("text/html")) {
    return "/index.html"
  }
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react(), localStoreProducts()],
  server: {
    allowedHosts: [
      "virgin-boundary-adapters-loaded.trycloudflare.com",
    ],
    proxy: {
      "/auth": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/store": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/admin": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        bypass: spaBypass,
      },
      "/static": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
      },
    },
  },
})
