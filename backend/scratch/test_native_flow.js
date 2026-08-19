const axios = require('axios');
const crypto = require('crypto');

async function testCreate() {
  try {
    const jwt = require('jsonwebtoken');
    // seller is 6b002ec4-d487-4413-9eb5-3346463556f4
    const token = jwt.sign({ id: '6b002ec4-d487-4413-9eb5-3346463556f4', role: 'citizen' }, process.env.JWT_SECRET || 'supersecretjwtkeyforcitizensandnotaries');

    const ref = 'BUS-' + crypto.randomUUID().split('-')[0];
    const payload = {
      type: 'business_share',
      reference_id: ref,
      metadata: { title: 'My Native Business', registration_number: 'B-1234' }
    };
    
    console.log("Registering asset...");
    const res = await axios.post('http://localhost:5001/api/assets/register', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Registered:", res.data);
    
    const assetId = res.data.assetId;
    
    const transferPayload = {
      property_id: assetId,
      to_user: '3b7d8b4d-325b-4da5-b12a-ce18259ab7fd',
      price: 5000,
      notary_request_id: 'd4c403eb-3ebd-47fe-9c28-3a769e076765'
    };
    
    console.log("Initiating transfer...");
    const tres = await axios.post('http://localhost:5001/api/transfers', transferPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Transfer Initiated:", tres.data);

  } catch (err) {
    console.error("ERROR:", err.response ? err.response.data : err.message);
  } finally {
    process.exit(0);
  }
}

testCreate();
