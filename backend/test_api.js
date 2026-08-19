const express = require('express');
const request = require('supertest');
const router = require('./routes/transferRoutes');
const db = require('./config/db');

const app = express();
app.use(express.json());
// Mock authenticate middleware
app.use((req, res, next) => {
  req.user = { id: '48f7f88b-ddaf-4c2d-b820-0d4b24a71c93', role: 'notary' };
  next();
});
app.use('/api/transfers', router);

async function run() {
  const res = await request(app).get('/api/transfers');
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));
  process.exit(0);
}
run();
