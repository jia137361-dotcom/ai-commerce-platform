const { Client } = require('pg');
const axios = require('axios');

const API_BASE = 'https://opentest.s2bdiy.com';
const APP_KEY = 'wm001';
const APP_SECRET = '7b55d8cf04caf3db9232c98eadeb9cc2';

const DB_CONFIG = {
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,
  connectionTimeoutMillis: 30000
};

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  
  console.log('Getting access token...');
  const response = await axios.post(`${API_BASE}/open/v1/accessToken`, {
    app_key: APP_KEY,
    app_secret: APP_SECRET
  });
  
  const data = response.data.data || response.data;
  accessToken = data.token || data.access_token;
  
  if (!accessToken) {
    throw new Error(`Failed to get access token: ${JSON.stringify(response.data)}`);
  }
  
  console.log('Access token obtained');
  return accessToken;
}

async function connectDB() {
  const db = new Client(DB_CONFIG);
  await db.connect();
  return db;
}

async function fetchProducts(page, pageSize) {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${API_BASE}/open/v1/basicProduct`, {
      params: { page, page_size: pageSize },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = response.data.data;
    return {
      products: data.data || [],
      total: data.total,
      lastPage: data.last_page,
      currentPage: data.current_page
    };
  } catch (err) {
    console.error(`Error fetching products page ${page}:`, err.message);
    return { products: [], total: 0, lastPage: 0, currentPage: 0 };
  }
}

async function insertProducts(db, products) {
  const values = [];
  const placeholders = [];
  let paramIndex = 1;
  
  for (const product of products) {
    const title = product.en_name || product.name || 'Untitled';
    const tags = [];
    if (product.produce_country_text) tags.push(product.produce_country_text);
    if (product.warehouse_name) tags.push(product.warehouse_name);
    
    const metadata = JSON.stringify({
      supplier_product_id: product.id,
      supplier_product_code: product.code,
      supplier_product_name_cn: product.name,
      supplier_product_name_en: product.en_name,
      purchase_price: product.purchase_price,
      produce_country: product.produce_country,
      warehouse_name: product.warehouse_name,
      colors: product.colors || [],
      sizes: product.sizes || [],
      views: product.views || [],
      image_url: product.view_image_src || product.design_product_image,
      blank_design_image: product.blank_design_image
    });
    
    placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9})`);
    values.push(
      `prod_s2bdiy_${product.id}`,
      'default_store',
      title,
      product.en_name ? `${product.name} (${product.en_name})` : product.name || '',
      'draft',
      product.purchase_price || 0,
      product.purchase_price || 0,
      JSON.stringify(tags),
      JSON.stringify([]),
      metadata
    );
    paramIndex += 10;
  }
  
  const sql = `
    INSERT INTO mc_product (
      id, store_id, title, description, status, price, cost,
      tags, category_ids, metadata
    ) VALUES ${placeholders.join(', ')}
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      updated_at = NOW()
  `;
  
  await db.query(sql, values);
}

async function syncProducts() {
  console.log('Step 1: Fetching all products from S2BDIY API...');
  
  // First, fetch all products from API
  let allProducts = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 20;
  
  while (hasMore) {
    console.log(`Fetching page ${page}...`);
    const result = await fetchProducts(page, pageSize);
    
    if (!result.products || result.products.length === 0) {
      hasMore = false;
      break;
    }
    
    allProducts = allProducts.concat(result.products);
    console.log(`Fetched ${allProducts.length} / ${result.total} products...`);
    
    hasMore = page < result.lastPage;
    page++;
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\nTotal products fetched: ${allProducts.length}`);

  // Deduplicate by (en_name, view_image_src) — keep first occurrence
  const seen = new Set();
  const deduped = [];
  for (const p of allProducts) {
    const key = `${p.en_name || ''}|${p.view_image_src || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }
  console.log(`After dedup: ${deduped.length} unique products (removed ${allProducts.length - deduped.length} duplicates)`);
  allProducts = deduped;

  // Step 2: Connect to database and insert
  console.log('\nStep 2: Connecting to database...');
  const db = await connectDB();
  
  try {
    // Check current count
    const countResult = await db.query('SELECT count(*) FROM mc_product');
    console.log(`Current products in DB: ${countResult.rows[0].count}`);
    
    // Delete all products
    console.log('Deleting all products...');
    await db.query('DELETE FROM mc_product');
    console.log('Products deleted.');
    
    // Insert in batches
    console.log('\nStep 3: Inserting products...');
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      try {
        await insertProducts(db, batch);
        inserted += batch.length;
        console.log(`Inserted ${inserted} / ${allProducts.length} products...`);
      } catch (err) {
        console.error(`Error inserting batch at ${i}:`, err.message);
      }
    }
    
    // Verify
    const finalCount = await db.query('SELECT count(*) FROM mc_product');
    console.log(`\nFinal product count: ${finalCount.rows[0].count}`);
    
    // Show sample
    const sample = await db.query('SELECT id, title, price FROM mc_product LIMIT 5');
    console.log('\nSample products:');
    sample.rows.forEach(p => console.log(`  ${p.id}: ${p.title} - $${p.price}`));
    
  } finally {
    await db.end();
  }
  
  console.log('\nSync complete!');
}

syncProducts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
