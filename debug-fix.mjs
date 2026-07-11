import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check all users with their auth identities
const result = await c.query(`
  SELECT u.id as user_id, u.email, ai.id as auth_id, ai.app_metadata
  FROM "user" u
  LEFT JOIN auth_identity ai ON ai.app_metadata->>'user_id' = u.id
  ORDER BY u.created_at
`);
console.log("=== Users + Auth Identities ===");
for (const row of result.rows) {
  console.log(`user: ${row.user_id} (${row.email})`);
  console.log(`  auth_identity: ${row.auth_id || 'NONE'}`);
  console.log(`  app_metadata: ${JSON.stringify(row.app_metadata)}`);
}

// Check provider identities
const provResult = await c.query(`
  SELECT pi.entity_id, pi.provider, pi.auth_identity_id,
    ai.app_metadata->>'user_id' as linked_user_id
  FROM provider_identity pi
  LEFT JOIN auth_identity ai ON pi.auth_identity_id = ai.id
  WHERE pi.entity_id IN (SELECT email FROM "user")
`);
console.log("\n=== Provider Identities (users only) ===");
for (const row of provResult.rows) {
  console.log(`${row.entity_id} (${row.provider}): auth=${row.auth_identity_id}, linked_user=${row.linked_user_id}`);
}

// Check what user_id the JWT would give us
console.log("\n=== Expected JWT actor_id for 1355026750@qq.com ===");
const authForEmail = await c.query(`
  SELECT ai.id, ai.app_metadata->>'user_id' as user_id
  FROM provider_identity pi
  JOIN auth_identity ai ON pi.auth_identity_id = ai.id
  WHERE pi.entity_id = $1 AND pi.provider = 'emailpass'
`, ["1355026750@qq.com"]);
console.log(JSON.stringify(authForEmail.rows, null, 2));

await c.end();
