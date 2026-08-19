require('dotenv').config({ path: './backend/.env' });
const db = require('../backend/config/db');
db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
  .then(res => {
    console.log(res.rows.map(r => r.column_name));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
