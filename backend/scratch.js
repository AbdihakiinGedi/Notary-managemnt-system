const db = require('./config/db');

async function check() {
  const res = await db.query('SELECT id, status, from_user, to_user, notary_request_id FROM ownership_transfers');
  console.log(res.rows);
  process.exit(0);
}
check();
