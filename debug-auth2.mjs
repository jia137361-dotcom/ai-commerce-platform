import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check the auth identity from JWT
const authId = await c.query(`
  SELECT ai.id, ai.app_metadata, ai.created_at
  FROM auth_identity ai
  WHERE ai.id = $1
`, ["authid_01KX3565BMB2DQXQ5QM50SPEP4"]);
console.log("=== Auth Identity from JWT ===");
console.log(JSON.stringify(authId.rows, null, 2));

// Check all auth identities for user_01KWRYZAK351VRRNS48ZGF2Z75
const userAuthIds = await c.query(`
  SELECT ai.id, ai.app_metadata
  FROM auth_identity ai
  WHERE ai.app_metadata->>'user_id' = $1
`, ["user_01KWRYZAK351VRRNS48ZGF2Z75"]);
console.log("\n=== Auth Identities for user_01KWRYZAK351VRRNS48ZGF2Z75 ===");
for (const row of userAuthIds.rows) {
  console.log(`${row.id}: ${JSON.stringify(row.app_metadata)}`);
}

await c.end();
