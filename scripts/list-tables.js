const { Client } = require('pg');
const db = new Client({ host: '162.0.214.180', port: 5432, database: 'citigoo', user: 'citigoo', password: '89fd0c304c45bbe483b2698e07ce5109', ssl: false, connectionTimeoutMillis: 10000 });
db.connect().then(() => db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).then(r => {
  r.rows.forEach(row => console.log(row.table_name));
  db.end();
}).catch(e => console.error('Error:', e.message));
