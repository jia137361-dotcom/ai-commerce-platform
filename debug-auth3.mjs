import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check all auth identities
const authIds = await c.query(`SELECT id, app_metadata, created_at FROM auth_identity ORDER BY created_at DESC`);
console.log("=== All Auth Identities ===");
for (const row of authIds.rows) {
  console.log(`${row.id}: ${JSON.stringify(row.app_metadata)} (${row.created_at})`);
}

// Check all provider identities
const provIds = await c.query(`SELECT id, entity_id, provider, auth_identity_id FROM provider_identity ORDER BY created_at DESC`);
console.log("\n=== All Provider Identities ===");
for (const row of provIds.rows) {
  console.log(`${row.entity_id} (${row.provider}): auth=${row.auth_identity_id}`);
}

// Check all users
const users = await c.query('SELECT id, email FROM "user" ORDER BY created_at');
console.log("\n=== All Users ===");
for (const row of users.rows) {
  console.log(`${row.id}: ${row.email}`);
}

await c.end();
