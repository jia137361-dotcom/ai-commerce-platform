import { Client } from "pg"
import dotenv from "dotenv"

dotenv.config({ path: "apps/medusa-backend/.env" })
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")

const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, query_timeout: 120000 })
db.on("error", (error) => console.error(`Database connection error: ${error.message}`))
await db.connect()

try {
  const store = await db.query("select store_id from mc_product where supplier_id='sup_s2bdiy' group by store_id order by count(*) desc limit 1")
  const storeId = store.rows[0]?.store_id
  if (!storeId) throw new Error("No S2BDIY products found in the configured database")
  const result = await db.query(`
    with mapped as (
      select p.id,
        jsonb_agg(
          v.value || jsonb_build_object(
            'supplier_variant_record_id', coalesce(v.value->'supplier_variant_record_id', to_jsonb(spv.id)),
            'supplier_external_variant_id', coalesce(v.value->'supplier_external_variant_id', to_jsonb(spv.supplier_variant_id)),
            'supplier_product_id', coalesce(v.value->'supplier_product_id', to_jsonb(p.supplier_product_id)),
            'basic_product_id', coalesce(v.value->'basic_product_id', to_jsonb(p.basic_product_id), to_jsonb(sp.basic_product_id)),
            'platform_sku', coalesce(v.value->'platform_sku', to_jsonb('CG-' || coalesce(p.basic_product_id, sp.basic_product_id, 'S2B') || '-' || coalesce(spv.supplier_variant_id, v.value->>'supplier_variant_id'))),
            'supplier_sku', coalesce(v.value->'supplier_sku', v.value->'sku', to_jsonb(coalesce(spv.sku, spv.supplier_variant_code))),
            'supplier_variant_code', coalesce(v.value->'supplier_variant_code', to_jsonb(spv.supplier_variant_code)),
            'supplier_size_id', coalesce(v.value->'supplier_size_id', to_jsonb(spv.supplier_size_id)),
            'supplier_color_id', coalesce(v.value->'supplier_color_id', to_jsonb(spv.supplier_color_id)),
            'cost', coalesce(v.value->'cost', to_jsonb(spv.cost), '0'::jsonb),
            'weight', coalesce(v.value->'weight', to_jsonb(spv.weight)),
            'length', coalesce(v.value->'length', to_jsonb(spv.length)),
            'width', coalesce(v.value->'width', to_jsonb(spv.width)),
            'height', coalesce(v.value->'height', to_jsonb(spv.height)),
            'warehouse_name', coalesce(v.value->'warehouse_name', to_jsonb(sp.warehouse_name)),
            'ship_from_country', coalesce(v.value->'ship_from_country', to_jsonb(p.ship_from_country), to_jsonb(sp.produce_country)),
            'print_spec_ids', coalesce(v.value->'print_spec_ids', ps.ids, '[]'::jsonb),
            'price_override', coalesce(v.value->'price_override', 'null'::jsonb),
            'enabled', coalesce(v.value->'enabled', 'true'::jsonb)
          ) order by v.ordinality
        ) as variants
      from mc_product p
      cross join lateral jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) with ordinality as v(value, ordinality)
      left join mc_supplier_product sp on sp.id=p.supplier_product_id
      left join mc_supplier_product_variant spv on spv.supplier_product_id=p.supplier_product_id and (spv.id=v.value->>'supplier_variant_id' or spv.supplier_variant_id=v.value->>'supplier_variant_id')
      left join lateral (select coalesce(jsonb_agg(id), '[]'::jsonb) as ids from mc_supplier_print_spec where supplier_product_id=p.supplier_product_id and status='active') ps on true
      where p.store_id=$1 and p.supplier_id='sup_s2bdiy'
      group by p.id
    )
    update mc_product p set variants=mapped.variants, updated_at=now() from mapped where p.id=mapped.id
  `, [storeId])
  const verification = await db.query(`
    select count(*)::int products, coalesce(sum(jsonb_array_length(variants)),0)::int variants,
      count(*) filter (where exists(select 1 from jsonb_array_elements(variants) item where not (item ? 'platform_sku') or not (item ? 'supplier_variant_record_id') or not (item ? 'enabled') or not (item ? 'price_override')))::int incomplete_products
    from mc_product where store_id=$1 and supplier_id='sup_s2bdiy'`, [storeId])
  console.log(JSON.stringify({ store_id: storeId, products_updated: result.rowCount, ...verification.rows[0] }))
} finally {
  await db.end()
}
