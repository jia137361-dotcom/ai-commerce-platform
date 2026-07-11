import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check all users with this email
const users = await c.query('SELECT id, email, created_at FROM "user" WHERE email = $1', ["1355026750@qq.com"]);
console.log("=== Users with 1355026750@qq.com ===");
for (const row of users.rows) {
  console.log(`${row.id}: ${row.email} (created: ${row.created_at})`);
}

// Check platform operators
const operators = await c.query("SELECT * FROM platform_operator");
console.log("\n=== Platform Operators ===");
for (const row of operators.rows) {
  console.log(`${row.id}: user_id=${row.user_id}, role=${row.role}, status=${row.status}`);
}

// Check auth identities for this email
const authIdentities = await c.query(`
  SELECT ai.id, ai.app_metadata, pi.entity_id, pi.provider
  FROM auth_identity ai
  LEFT JOIN provider_identity pi ON ai.id = pi.auth_identity_id
  WHERE ai.app_metadata->>'user_id' IN (
    SELECT id FROM "user" WHERE email = $1
  )
`, ["1355026750@qq.com"]);
console.log("\n=== Auth Identities ===");
for (const row of authIdentities.rows) {
  console.log(`auth_identity: ${row.id}`);
  console.log(`  app_metadata: ${JSON.stringify(row.app_metadata)}`);
  console.log(`  provider: ${row.provider}, entity_id: ${row.entity_id}`);
}

await c.end();
