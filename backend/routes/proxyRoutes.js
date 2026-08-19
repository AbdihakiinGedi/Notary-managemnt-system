const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy POST login to external DigitalMeeting24 API
router.post('/auth/login', async (req, res) => {
  console.log('[PROXY] POST /auth/login forwarding to external API');
  try {
    const externalResponse = await axios.post('https://api.digitalmeeting24.com/api/v1/auth/login', req.body, {
      headers: {
        // Forward any auth headers if needed
        ...req.headers,
        // Ensure content-type is application/json
        'Content-Type': 'application/json'
      }
    });
    // Set CORS header for our own domain
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.status(externalResponse.status).json(externalResponse.data);
  } catch (error) {
    console.error('[PROXY ERROR]', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({ error: 'Bad gateway - unable to reach external service' });
    }
  }
});

module.exports = router;
