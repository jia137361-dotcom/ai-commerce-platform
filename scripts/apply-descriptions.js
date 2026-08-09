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

async function updateDescriptions() {
  const descriptions = JSON.parse(fs.readFileSync('scripts/s2bdiy-descriptions.json', 'utf8'));
  console.log(`Loaded ${Object.keys(descriptions).length} descriptions`);
  
  const db = new Client(DB_CONFIG);
  await db.connect();
  
  try {
    let updated = 0;
    let skipped = 0;
    
    const entries = Object.entries(descriptions);
    
    for (let i = 0; i < entries.length; i++) {
      const [supplierId, desc] = entries[i];
      const dbId = `prod_s2bdiy_${supplierId}`;
      
      try {
        const result = await db.query(
          'UPDATE mc_product SET description = $1, updated_at = NOW() WHERE id = $2',
          [desc.description || '', dbId]
        );
        
        if (result.rowCount > 0) {
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Error updating ${dbId}:`, err.message);
      }
      
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1} / ${entries.length} (updated: ${updated}, skipped: ${skipped})`);
      }
    }
    
    console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
    
    // Show sample
    const sample = await db.query("SELECT id, title, description FROM mc_product WHERE LENGTH(description) > 100 LIMIT 3");
    console.log('\nSample updated products:');
    sample.rows.forEach(p => {
      console.log(`  ${p.id}: ${p.title}`);
      console.log(`    ${(p.description || '').substring(0, 150)}...`);
    });
    
  } finally {
    await db.end();
  }
}

updateDescriptions().catch(console.error);
