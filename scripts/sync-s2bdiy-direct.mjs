import { Client } from "pg"
import dotenv from "dotenv"

dotenv.config({ path: "apps/medusa-backend/.env" })

const storeId = process.env.DEFAULT_STORE_ID || "01KXCZMXT8DSCSMBS0ZC69J12E"
const supplierId = "sup_s2bdiy"
const apiBaseUrl = (process.env.S2BDIY_API_BASE_URL || process.env.S2BDIY_BASE_URL || "").replace(/\/$/, "")
const appKey = process.env.S2BDIY_APP_KEY
const appSecret = process.env.S2BDIY_APP_SECRET
const maxProducts = Number(process.env.S2BDIY_DIRECT_MAX_PRODUCTS || 0)
const startPage = Math.max(Number(process.env.S2BDIY_DIRECT_START_PAGE || 1), 1)
const requestTimeoutMs = Number(process.env.S2BDIY_REQUEST_TIMEOUT_MS || 30000)
const logEvery = Math.max(Number(process.env.S2BDIY_DIRECT_LOG_EVERY || 25), 1)

if (!apiBaseUrl || !appKey || !appSecret) {
  throw new Error("S2BDIY credentials are not configured in apps/medusa-backend/.env")
}

const request = async (url, options = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`)
    return payload.data ?? payload
  } finally {
    clearTimeout(timeout)
  }
}

const getAccessToken = () => request(`${apiBaseUrl}/open/v1/accessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
}).then((data) => {
  const token = data.token ?? data.access_token
  if (!token) throw new Error("S2BDIY access token response contains no token")
  return token
})

const retailPrice = (cost) => {
  const numericCost = Number(cost) || 0
  if (!numericCost) return 29.99
  const usd = numericCost / 6.77
  const markup = usd <= 20 / 6.77 ? 3 : usd >= 40 / 6.77 ? 2.3 : 3 - ((usd - 20 / 6.77) / (20 / 6.77)) * 0.7
  return Math.round(usd * markup * 100) / 100
}

const titleFor = (product) => {
  const base = String(product.en_name || product.name || `S2BDIY product ${product.id}`).trim()
  const tail = String(product.name || "").split("-").slice(1).join("-")
    .replace(/英国/g, "England")
    .replace(/美国/g, "US")
    .replace(/加拿大/g, "Canada")
    .replace(/澳大利亚/g, "Australia")
    .replace(/海外本土/g, "Overseas Local")
    .replace(/海外/g, "Overseas")
    .replace(/本土/g, "Local")
    .replace(/[（）()]/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return tail && !base.toLowerCase().includes(tail.toLowerCase()) ? `${base} — ${tail}` : base
}

const shipFromCountry = (value) => {
  const normalized = String(value || "").trim().toLowerCase()
  if (/^(us|usa|united states)$/.test(normalized)) return "us"
  if (/^(gb|uk|england|united kingdom)$/.test(normalized)) return "gb"
  if (/^(ca|canada)$/.test(normalized)) return "ca"
  if (/^(au|australia)$/.test(normalized)) return "au"
  return null
}

const getExistingSupplier = async (db, basicProductId) => {
  const { rows } = await db.query(
    "select id from mc_supplier_product where basic_product_id = $1 or supplier_product_id = $2 order by created_at asc limit 1",
    [String(basicProductId), `s2b_basic_${basicProductId}`],
  )
  return rows[0]?.id ?? null
}

const syncProduct = async (db, token, basicProductId) => {
  const product = await request(`${apiBaseUrl}/open/v1/basicProduct/${basicProductId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  const supplierProductId = (await getExistingSupplier(db, product.id)) || `sp_s2b_${product.id}`
  const cost = Number(product.purchase_price) || 0
  const price = retailPrice(cost)
  const items = Array.isArray(product.items) ? product.items : []
  const colors = Array.isArray(product.colors) ? product.colors : []
  const sizes = Array.isArray(product.sizes) ? product.sizes : []
  const views = Array.isArray(product.views) ? product.views : []
  const printAreas = Array.isArray(product.print_areas) ? product.print_areas : []
  const variants = items.map((item) => ({
    supplier_variant_id: String(item.id), supplier_size_id: String(item.size_id ?? ""), supplier_color_id: String(item.color_id ?? ""),
    color: colors.find((color) => color.id === item.color_id)?.en_name || colors.find((color) => color.id === item.color_id)?.name || "Default",
    size: sizes.find((size) => size.id === item.size_id)?.en_name || sizes.find((size) => size.id === item.size_id)?.name || "Default",
    sku: item.code || `S2B-${product.id}-${item.id}`, cost: Number(item.price) || 0, price,
    weight: Number(item.weight) || null, length: Number(item.length) || null, width: Number(item.width) || null, height: Number(item.height) || null, stock: 50,
  }))

  await db.query("begin")
  try {
    await db.query(
      `insert into mc_supplier_product (id, supplier_id, supplier_product_id, platform_product_id, basic_product_id, basic_product_code, basic_product_name, basic_product_en_name, name, category, purchase_price, product_show_master_image, produce_country, warehouse_name, deliver_goods_text, base_cost, currency, status, raw_json, created_at, updated_at)
       values ($1,$2,$3,'',$4,$5,$6,$7,$6,'apparel',$8,$9,$10,$11,$12,$8,'usd','active',$13,now(),now())
       on conflict (id) do update set basic_product_code=excluded.basic_product_code,basic_product_name=excluded.basic_product_name,basic_product_en_name=excluded.basic_product_en_name,name=excluded.name,purchase_price=excluded.purchase_price,product_show_master_image=excluded.product_show_master_image,produce_country=excluded.produce_country,warehouse_name=excluded.warehouse_name,deliver_goods_text=excluded.deliver_goods_text,base_cost=excluded.base_cost,raw_json=excluded.raw_json,updated_at=now()`,
      [supplierProductId, supplierId, `s2b_basic_${product.id}`, String(product.id), product.code ?? null, product.name ?? null, product.en_name ?? null, cost, product.product_show_master_image ?? null, product.produce_country ?? null, product.warehouse_name ?? null, product.deliver_goods_text ?? null, product],
    )
    for (const item of items) {
      const color = colors.find((entry) => entry.id === item.color_id) || {}
      const size = sizes.find((entry) => entry.id === item.size_id) || {}
      await db.query(
        `insert into mc_supplier_product_variant (id,supplier_product_id,basic_product_id,supplier_variant_id,supplier_variant_code,supplier_size_id,supplier_color_id,color,size,size_name,color_name,sku,cost,weight,length,width,height,stock_status,raw_json,created_at,updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$8,$10,$11,$12,$13,$14,$15,'in_stock',$16,now(),now())
         on conflict (id) do update set supplier_variant_code=excluded.supplier_variant_code,supplier_size_id=excluded.supplier_size_id,supplier_color_id=excluded.supplier_color_id,color=excluded.color,size=excluded.size,size_name=excluded.size_name,color_name=excluded.color_name,sku=excluded.sku,cost=excluded.cost,weight=excluded.weight,length=excluded.length,width=excluded.width,height=excluded.height,raw_json=excluded.raw_json,updated_at=now()`,
        [`spv_s2b_${product.id}_${item.id}`, supplierProductId, String(product.id), String(item.id), item.code ?? null, String(item.size_id ?? ""), String(item.color_id ?? ""), color.en_name ?? color.name ?? null, size.en_name ?? size.name ?? null, item.code ?? `S2B-${product.id}-${item.id}`, Number(item.price) || 0, Number(item.weight) || null, Number(item.length) || null, Number(item.width) || null, Number(item.height) || null, item],
      )
    }
    for (const view of views) {
      const area = printAreas.find((entry) => String(entry.view_id) === String(view.id)) || {}
      const existingSpec = await db.query(
        "select id from mc_supplier_print_spec where supplier_product_id=$1 and view_id=$2 limit 1",
        [supplierProductId, String(view.id)],
      )
      const printSpecId = existingSpec.rows[0]?.id ?? `sps_s2b_${product.id}_${view.id}`
      await db.query(
        `insert into mc_supplier_print_spec (id,supplier_product_id,basic_product_id,view_id,view_name,view_en_name,print_position,print_file_width,print_file_height,dpi,design_area_width,design_area_height,design_area_unit,design_type,tip_level,accepted_formats,status,created_at,updated_at)
         values ($1,$2,$3,$4,$5,$6,$5,$7,$8,300,$7,$8,'px',1,$9,array['png','jpg','jpeg'],'active',now(),now())
         on conflict (id) do update set view_name=excluded.view_name,view_en_name=excluded.view_en_name,print_position=excluded.print_position,print_file_width=excluded.print_file_width,print_file_height=excluded.print_file_height,design_area_width=excluded.design_area_width,design_area_height=excluded.design_area_height,tip_level=excluded.tip_level,updated_at=now()`,
        [printSpecId, supplierProductId, String(product.id), String(view.id), view.name ?? null, view.en_name ?? null, Math.round(Number(area.width) || 0), Math.round(Number(area.height) || 0), String(view.tip_level ?? "")],
      )
    }
    const existingDraft = await db.query("select id from mc_product where store_id=$1 and supplier_product_id=$2 limit 1", [storeId, supplierProductId])
    if (!existingDraft.rows.length) {
      const masterImage = product.product_show_master_image ?? null
      await db.query(
        `insert into mc_product (id,store_id,title,description,status,source,supplier_id,basic_product_id,supplier_product_id,image_url,mockup_image_url,tags,price,cost,variants,category_ids,ship_from_country,metadata,created_at,updated_at)
         values ($1,$2,$3,$4,'draft','manual',$5,$6,$7,$8,$8,array['s2bdiy','supplier-catalog'],$9,$10,$11,array[]::text[],$12,$13,now(),now())`,
        [`prod_s2b_${product.id}`, storeId, titleFor(product), product.en_desc ?? null, supplierId, String(product.id), supplierProductId, masterImage, price, cost, JSON.stringify(variants), shipFromCountry(product.produce_country), { synced_from_supplier: true, supplier_catalog_draft: true, external_supplier_product_id: `s2b_basic_${product.id}`, supplier_details: product }],
      )
    }
    await db.query("commit")
    return { id: product.id, variants: items.length, views: views.length, createdDraft: !existingDraft.rows.length }
  } catch (error) {
    await db.query("rollback")
    throw error
  }
}

const isConnectionError = (error) => /connection terminated|connection ended|ECONNRESET|timeout expired|query read timeout|Connection terminated unexpectedly/i.test(String(error?.message || error))

const openDatabase = async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, query_timeout: 120000 })
  db.on("error", (error) => console.error(`Database connection error: ${error.message}`))
  await db.connect()
  return db
}

const main = async () => {
  let db = await openDatabase()
  const token = await getAccessToken()
  let processed = 0
  let failed = 0
  let attempted = 0
  try {
    for (let page = startPage; ; page += 1) {
      const catalog = await request(`${apiBaseUrl}/open/v1/basicProduct?page=${page}&per_page=100`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      const rows = Array.isArray(catalog.data) ? catalog.data : []
      console.log(`Page ${page}/${catalog.last_page ?? page}: ${rows.length} products`)
      for (const row of rows) {
        if (maxProducts > 0 && attempted >= maxProducts) return
        attempted += 1
        try {
          let result
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              result = await syncProduct(db, token, Number(row.id))
              break
            } catch (error) {
              if (!isConnectionError(error) || attempt === 3) throw error
              console.error(`Database reconnect before product ${row.id} (attempt ${attempt}/3)`)
              try { await db.end() } catch {}
              db = await openDatabase()
            }
          }
          processed += 1
          if (processed <= 3 || processed % logEvery === 0) {
            console.log(`OK ${result.id}: processed ${processed}, ${result.variants} variants, ${result.views} print views${result.createdDraft ? ', draft created' : ''}`)
          }
        } catch (error) {
          failed += 1
          console.error(`FAIL ${row.id}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      if (page >= Number(catalog.last_page || page) || !rows.length) break
    }
    console.log(`Done. Processed ${processed}; failed ${failed}.`)
  } finally {
    await db.end()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
