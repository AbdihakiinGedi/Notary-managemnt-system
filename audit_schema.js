require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/db');
async function check() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'");
    console.log('Notifications Columns:', res.rows.map(r => r.column_name));
    
    const res2 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'properties'");
    console.log('Properties Columns:', res2.rows.map(r => r.column_name));
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
