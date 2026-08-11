const { Client } = require('pg');
const fs = require('fs');

const DB_CONFIG = {
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,
  connectionTimeoutMillis: 30000
};

const PRODUCTS_FILE = 'scripts/s2bdiy-products.json';

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
      tags,
      [],
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

async function importToDatabase() {
  console.log('Reading products from file...');
  const allProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  console.log(`Loaded ${allProducts.length} products`);

  // Deduplicate by (en_name, view_image_src) — keep first occurrence
  const seen = new Set();
  const products = [];
  for (const p of allProducts) {
    const key = `${p.en_name || ''}|${p.view_image_src || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      products.push(p);
    }
  }
  console.log(`After dedup: ${products.length} unique products (removed ${allProducts.length - products.length} duplicates)`);
  
  console.log('Connecting to database...');
  const db = new Client(DB_CONFIG);
  await db.connect();
  
  try {
    // Check current count
    const countResult = await db.query('SELECT count(*) FROM mc_product');
    console.log(`Current products in DB: ${countResult.rows[0].count}`);
    
    // Delete all products
    console.log('Deleting all products...');
    await db.query('DELETE FROM mc_product');
    console.log('Products deleted.');
    
    // Insert in batches
    console.log('\nInserting products...');
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      try {
        await insertProducts(db, batch);
        inserted += batch.length;
        console.log(`Inserted ${inserted} / ${products.length} products...`);
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
  
  console.log('\nImport complete!');
}

importToDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
