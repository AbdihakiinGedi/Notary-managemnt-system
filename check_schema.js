require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/db');
async function check() {
  const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties'");
  console.log(res.rows);
  process.exit();
}
check();
