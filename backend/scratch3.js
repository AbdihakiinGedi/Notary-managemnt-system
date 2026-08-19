const db = require('./config/db');
async function test() {
  const result = await db.query("SELECT id FROM roles WHERE name = 'notary'");
  console.log('Lowercase notary:', result.rows);
  const result2 = await db.query("SELECT id FROM roles WHERE name = 'Notary'");
  console.log('Titlecase Notary:', result2.rows);
  process.exit(0);
}
test();
