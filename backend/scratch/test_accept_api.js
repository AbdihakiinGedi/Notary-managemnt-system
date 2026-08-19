const axios = require('axios');

async function testApi() {
  try {
    // 3b7d8b4d-325b-4da5-b12a-ce18259ab7fd is the buyer
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: '3b7d8b4d-325b-4da5-b12a-ce18259ab7fd', role: 'citizen' }, process.env.JWT_SECRET || 'supersecretjwtkeyforcitizensandnotaries');
    
    // reset transfer status to initiated first
    const db = require('../config/db');
    await db.query('UPDATE ownership_transfers SET status = \'initiated\' WHERE id = \'b678c4bb-0391-4c46-af5b-02078b1583c7\'');
    // clear transfer_agreements
    await db.query('DELETE FROM transfer_agreements WHERE transfer_id = \'b678c4bb-0391-4c46-af5b-02078b1583c7\'');

    console.log("Status reset. Attempting to accept transfer via API...");

    const res = await axios.patch('http://localhost:5001/api/transfers/b678c4bb-0391-4c46-af5b-02078b1583c7/accept', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("API ERROR:", err.response ? err.response.data : err.message);
  } finally {
    process.exit(0);
  }
}

testApi();
