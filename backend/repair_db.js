const db = require('./config/db');

(async () => {
  try {
    const updateRes = await db.query("UPDATE users SET national_id = verification_number WHERE (national_id IS NULL OR national_id = '' OR national_id = 'N/A' OR national_id = 'Pending') AND verification_type = 'national_id' AND verification_number IS NOT NULL");
    console.log('Updated ' + updateRes.rowCount + ' users with real National IDs.');

    const nullifyRes = await db.query("UPDATE users SET national_id = NULL WHERE national_id = '' OR national_id = 'N/A' OR national_id = 'Pending'");
    console.log('Nullified ' + nullifyRes.rowCount + ' bad placeholder National IDs.');

    const flagRes = await db.query("UPDATE users SET account_status = 'pending_correction' WHERE national_id IS NULL");
    console.log('Flagged ' + flagRes.rowCount + ' users for correction due to missing National ID.');

    try {
      await db.query("ALTER TABLE users ADD CONSTRAINT unique_national_id UNIQUE (national_id)");
      console.log('Added unique_national_id constraint successfully.');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('unique_national_id constraint already exists.');
      } else {
        throw err;
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
