const { Client } = require('pg');
const db = new Client({
  host: '162.0.214.180',
  port: 5432,
  database: 'citigoo',
  user: 'citigoo',
  password: '89fd0c304c45bbe483b2698e07ce5109',
  ssl: false
});

db.connect().then(() => {
  return db.query('SELECT id, email, first_name, last_name FROM "user" LIMIT 5');
}).then(r => {
  console.log('Users:', JSON.stringify(r.rows, null, 2));
  db.end();
}).catch(e => {
  console.error('Error:', e.message);
});
