const db = require('../config/db');

async function checkUser() {
  try {
    const res = await db.query("SELECT profile_photo FROM users WHERE id = '6b002ec4-d487-4413-9eb5-3346463556f4'");
    console.log("User Photo:", res.rows[0]);
  } catch (error) {
    console.error("DB Error:", error.message);
  } finally {
    process.exit(0);
  }
}

checkUser();
