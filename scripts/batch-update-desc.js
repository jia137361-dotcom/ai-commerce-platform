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

const descriptions = JSON.parse(fs.readFileSync('scripts/s2bdiy-descriptions.json', 'utf8'));
const entries = Object.entries(descriptions);

async function batchUpdate() {
  const db = new Client(DB_CONFIG);
  await db.connect();
  
  try {
    const batchSize = 20;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      const values = [];
      const valuePlaceholders = [];
      let paramIdx = 1;
      
      for (const [sid, desc] of batch) {
        valuePlaceholders.push(`($${paramIdx}, $${paramIdx + 1})`);
        values.push(`prod_s2bdiy_${sid}`, desc.description || '');
        paramIdx += 2;
      }
      
      const sql = `
        UPDATE mc_product 
        SET description = v.desc_text, updated_at = NOW() 
        FROM (VALUES ${valuePlaceholders.join(', ')}) AS v(id, desc_text) 
        WHERE mc_product.id = v.id
      `;
      
      await db.query(sql, values);
      
      if ((i + batchSize) % 100 === 0 || i + batchSize >= entries.length) {
        console.log(`Updated ${Math.min(i + batchSize, entries.length)} / ${entries.length}`);
      }
    }
    
    console.log('All done!');
  } finally {
    await db.end();
  }
}

batchUpdate().catch(console.error);
