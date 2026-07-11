import pg from "pg";
const c = new pg.Client({host:"localhost",port:5433,database:"ai_commerce",user:"medusa",password:"medusa"});
await c.connect();

const r = await c.query("SELECT * FROM platform_operator WHERE user_id = $1 AND status = $2", ["user_01KX3564AZZTJ9MK1M4HTDR5J7", "active"]);
console.log("Direct query result:", JSON.stringify(r.rows));

// Also check store_member
const sm = await c.query("SELECT * FROM store_member WHERE user_id = $1", ["user_01KX357CFMF9SPQ0XMEND8VVH9"]);
console.log("Store member:", JSON.stringify(sm.rows));

await c.end();
