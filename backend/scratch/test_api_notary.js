const axios = require('axios');

async function testApi() {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ0YzQwM2ViLTNlYmQtNDdmZS05YzI4LTNhNzY5ZTA3Njc2NSIsInJvbGUiOiJub3RhcnkiLCJpYXQiOjE3ODY1NjMwNTl9.zBEuAEO6U49TRrmkXtsWUGLUvqlmAjEeNcdYJ9ibL6c';
    const res = await axios.get('http://localhost:5001/api/transfers', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

testApi();
