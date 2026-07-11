import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();
const r = await c.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE '%auth%' OR tablename LIKE '%user%' OR tablename LIKE '%identity%' OR tablename LIKE '%session%' OR tablename LIKE '%jwt%') ORDER BY tablename`);
for (const row of r.rows) console.log(row.tablename);
await c.end();
