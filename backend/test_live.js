const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const notary_id = '48f7f88b-ddaf-4c2d-b820-0d4b24a71c93';
  const token = jwt.sign({ id: notary_id, role: 'notary', full_name: 'Notary User' }, 'snd_secret_key_2024');

  try {
    const res = await axios.get('http://localhost:5000/api/transfers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    console.log('Data Length:', res.data.length);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
