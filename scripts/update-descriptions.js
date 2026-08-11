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
  ssl: false
};

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  const response = await axios.post(`${API_BASE}/open/v1/accessToken`, {
    app_key: APP_KEY,
    app_secret: APP_SECRET
  });
  accessToken = response.data.data.token;
  return accessToken;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchProductDetail(productId) {
  const token = await getAccessToken();
  const response = await axios.get(`${API_BASE}/open/v1/basicProduct/${productId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.data.data;
}

async function connectDB() {
  const db = new Client(DB_CONFIG);
  await db.connect();
  return db;
}

async function updateDescriptions() {
  let db = await connectDB();
  
  try {
    // Get products that need description update (current desc is short)
    const result = await db.query("SELECT id, metadata FROM mc_product WHERE id LIKE 'prod_s2bdiy_%' AND (description IS NULL OR LENGTH(description) < 50)");
    const products = result.rows;
    console.log(`Found ${products.length} products needing description update`);
    
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      
      try {
        const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
        const supplierId = meta.supplier_product_id;
        
        const detail = await fetchProductDetail(supplierId);
        const enDesc = stripHtml(detail.en_desc || '');
        const cnDesc = stripHtml(detail.desc || '');
        
        const description = enDesc || cnDesc || '';
        
        await db.query('UPDATE mc_product SET description = $1, updated_at = NOW() WHERE id = $2', [description, p.id]);
        updated++;
        
      } catch (err) {
        errors++;
        // If connection error, reconnect
        if (err.message.includes('terminated') || err.message.includes('ECONNRESET')) {
          console.log('Reconnecting to database...');
          try { await db.end(); } catch {}
          db = await connectDB();
        }
      }
      
      if ((i + 1) % 20 === 0) {
        console.log(`Progress: ${i + 1} / ${products.length} (updated: ${updated}, errors: ${errors})`);
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 250));
    }
    
    console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
    
    // Show sample
    const sample = await db.query('SELECT id, title, description FROM mc_product WHERE LENGTH(description) > 50 LIMIT 3');
    console.log('\nSample updated products:');
    sample.rows.forEach(p => {
      console.log(`  ${p.id}: ${p.title}`);
      console.log(`    ${(p.description || '').substring(0, 120)}...`);
    });
    
    await db.end();
  } catch (err) {
    console.error('Fatal error:', err);
    try { await db.end(); } catch {}
  }
}

updateDescriptions();
