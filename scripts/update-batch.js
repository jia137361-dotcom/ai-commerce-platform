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

async function updateBatch(startIdx) {
  const descriptions = JSON.parse(fs.readFileSync('scripts/s2bdiy-descriptions.json', 'utf8'));
  const entries = Object.entries(descriptions);
  const batch = entries.slice(startIdx, startIdx + 100);
  
  if (batch.length === 0) {
    console.log('All done!');
    return;
  }
  
  console.log(`Processing batch ${startIdx + 1} - ${startIdx + batch.length}...`);
  
  const db = new Client(DB_CONFIG);
  await db.connect();
  
  try {
    for (const [supplierId, desc] of batch) {
      const dbId = `prod_s2bdiy_${supplierId}`;
      await db.query('UPDATE mc_product SET description = $1, updated_at = NOW() WHERE id = $2 AND (description IS NULL OR LENGTH(description) < 50)', [desc.description || '', dbId]);
    }
    console.log(`Batch complete`);
  } finally {
    await db.end();
  }
}

const startIdx = parseInt(process.argv[2]) || 0;
updateBatch(startIdx).catch(console.error);
