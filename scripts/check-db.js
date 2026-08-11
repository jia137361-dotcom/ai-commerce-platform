const { Client } = require('pg');
const db = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false,
  connectionTimeoutMillis: 10000
});

db.connect().then(() => {
  console.log('Database connected OK');
  return db.query('SELECT count(*) FROM mc_product');
}).then(r => {
  console.log('Products:', r.rows[0].count);
  db.end();
}).catch(e => {
  console.error('DB Error:', e.message);
});
