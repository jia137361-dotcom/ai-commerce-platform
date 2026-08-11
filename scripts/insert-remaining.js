const { Client } = require('pg');
const fs = require('fs');

const DB_CONFIG = {
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false
};

const products = JSON.parse(fs.readFileSync('scripts/s2bdiy-products.json', 'utf8'));

async function insertRemaining() {
  const db = new Client(DB_CONFIG);
  await db.connect();
  
  try {
    // Get existing IDs
    const existing = await db.query('SELECT id FROM mc_product');
    const existingIds = new Set(existing.rows.map(r => r.id));
    
    // Find products to insert
    const toInsert = products.filter(p => !existingIds.has(`prod_s2bdiy_${p.id}`));
    console.log(`Found ${toInsert.length} products to insert`);
    
    if (toInsert.length === 0) {
      console.log('All products already inserted');
      return;
    }
    
    // Insert one by one
    for (let i = 0; i < toInsert.length; i++) {
      const p = toInsert[i];
      const title = p.en_name || p.name || 'Untitled';
      
      await db.query(`
        INSERT INTO mc_product (id, store_id, title, description, status, price, cost, tags, category_ids, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        `prod_s2bdiy_${p.id}`,
        'default_store',
        title,
        p.en_name ? `${p.name} (${p.en_name})` : p.name || '',
        'draft',
        p.purchase_price || 0,
        p.purchase_price || 0,
        JSON.stringify([p.produce_country_text, p.warehouse_name].filter(Boolean)),
        JSON.stringify([]),
        JSON.stringify({ supplier_product_id: p.id, supplier_product_code: p.code })
      ]);
      
      if ((i + 1) % 10 === 0) console.log(`Inserted ${i + 1} / ${toInsert.length}`);
    }
    
    const count = await db.query('SELECT count(*) FROM mc_product');
    console.log(`Final count: ${count.rows[0].count}`);
  } finally {
    await db.end();
  }
}

insertRemaining().catch(console.error);
