import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

// Check user with JWT actor_id
const user = await c.query('SELECT id, email FROM "user" WHERE id = $1', ["user_01KX3564AZZTJ9MK1M4HTDR5J7"]);
console.log("=== User with JWT actor_id ===");
console.log(JSON.stringify(user.rows, null, 2));

// Check all users
const allUsers = await c.query('SELECT id, email FROM "user" ORDER BY created_at');
console.log("\n=== All Users ===");
for (const row of allUsers.rows) {
  console.log(`${row.id}: ${row.email}`);
}

await c.end();
