import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// The JWT actor_ids from login
const mapping = {
  "1355026750@qq.com": "user_01KX3564AZZTJ9MK1M4HTDR5J7",    // Platform Ops
  "lujiamengvivi79@gmail.com": "user_01KX357CFMF9SPQ0XMEND8VVH9", // Seller
};

for (const [email, newUserId] of Object.entries(mapping)) {
  // Get old user_id
  const oldUser = await c.query('SELECT id FROM "user" WHERE email = $1', [email]);
  if (oldUser.rows.length === 0) {
    console.log(`No user found for ${email}`);
    continue;
  }
  const oldUserId = oldUser.rows[0].id;
  if (oldUserId === newUserId) {
    console.log(`${email}: already correct (${oldUserId})`);
    continue;
  }

  console.log(`Fixing ${email}: ${oldUserId} -> ${newUserId}`);

  // Update user table
  await c.query('UPDATE "user" SET id = $1 WHERE id = $2', [newUserId, oldUserId]);
  console.log(`  Updated user table`);

  // Update auth_identity app_metadata
  await c.query('UPDATE auth_identity SET app_metadata = $1 WHERE app_metadata->>\'user_id\' = $2', [
    JSON.stringify({ user_id: newUserId }),
    oldUserId,
  ]);
  console.log(`  Updated auth_identity`);

  // Update platform_operator if exists
  const po = await c.query('UPDATE platform_operator SET user_id = $1 WHERE user_id = $2 RETURNING *', [newUserId, oldUserId]);
  if (po.rows.length > 0) console.log(`  Updated platform_operator`);

  // Update store_members if exists
  const sm = await c.query('UPDATE store_member SET user_id = $1 WHERE user_id = $2 RETURNING *', [newUserId, oldUserId]);
  if (sm.rows.length > 0) console.log(`  Updated store_member (${sm.rows.length} rows)`);
}

// Verify
console.log("\n=== Verification ===");
const users = await c.query('SELECT id, email FROM "user" ORDER BY created_at');
for (const row of users.rows) {
  console.log(`${row.id}: ${row.email}`);
}
const ops = await c.query('SELECT * FROM platform_operator');
for (const row of ops.rows) {
  console.log(`Operator: user_id=${row.user_id}, role=${row.role}`);
}

await c.end();
