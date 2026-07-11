import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check auth identities
const authIds = await c.query(`
  SELECT ai.id, ai.app_metadata, ai.created_at
  FROM auth_identity ai
  ORDER BY ai.created_at DESC
  LIMIT 10
`);
console.log("=== Recent Auth Identities ===");
for (const row of authIds.rows) {
  console.log(`${row.id}: ${JSON.stringify(row.app_metadata)} (created: ${row.created_at})`);
}

// Check provider identities for 1355026750@qq.com
const providers = await c.query(`
  SELECT pi.id, pi.entity_id, pi.provider, pi.auth_identity_id
  FROM provider_identity pi
  WHERE pi.entity_id = $1
`, ["1355026750@qq.com"]);
console.log("\n=== Provider Identities for 1355026750@qq.com ===");
for (const row of providers.rows) {
  console.log(`${row.id}: entity=${row.entity_id}, provider=${row.provider}, auth_identity=${row.auth_identity_id}`);
}

await c.end();
