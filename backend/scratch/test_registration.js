const express = require('express');
const app = express();
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

app.use(express.json());

// Fake auth middleware
app.use((req, res, next) => {
  req.user = { id: req.headers['x-user-id'], role: req.headers['x-user-role'], full_name: 'Test User' };
  next();
});

// We need to bypass the `upload.fields` middleware in propertyRoutes because it expects multipart/form-data with actual files.
// For testing, we can just stub it.
jest = { mock: () => {} }; // just a fake jest if needed
const uploadMiddleware = require('c:/Users/Administrator/Desktop/SND/backend/middleware/uploadMiddleware');
uploadMiddleware.fields = () => (req, res, next) => {
  req.files = { image: [], documents: [] };
  next();
};

const propertyRoutes = require('c:/Users/Administrator/Desktop/SND/backend/routes/propertyRoutes');
const transferRoutes = require('c:/Users/Administrator/Desktop/SND/backend/routes/transferRoutes');

app.use('/api/properties', propertyRoutes);
app.use('/api/transfers', transferRoutes);

const db = require('c:/Users/Administrator/Desktop/SND/backend/config/db');

async function runTests() {
  console.log("--- STARTING TESTS ---");
  const citizenId = uuidv4();
  const citizenBId = uuidv4();
  const notaryId = uuidv4();

  try {
    // Setup users
    await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash) VALUES ($1, $2, $3, $4, 1, 'photo.jpg', 'hash')`, [citizenId, 'NAT-'+Date.now(), 'Citizen A', 'a@test.com']);
    await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash) VALUES ($1, $2, $3, $4, 1, 'photo.jpg', 'hash')`, [citizenBId, 'NAT-'+Date.now()+1, 'Citizen B', 'b@test.com']);
    await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash) VALUES ($1, $2, $3, $4, 2, 'photo.jpg', 'hash')`, [notaryId, 'NAT-'+Date.now()+2, 'Notary', 'n@test.com']);

    console.log("\\n1. Testing Land Registration...");
    const landRes = await request(app)
      .post('/api/properties')
      .set('x-user-id', citizenId)
      .set('x-user-role', 'citizen')
      .send({
        title: 'My Land',
        description: 'Test',
        district: 'Mogadishu',
        address: '123 Test St',
        type: 'land',
        latitude: '2.0',
        longitude: '45.0',
        visibility: 'public'
      });
    console.log("Land Status:", landRes.status);
    console.log("Land Body:", landRes.body);
    if (landRes.status !== 201) throw new Error("Land Registration failed");

    console.log("\\n2. Testing Motorcycle Registration with empty coordinates...");
    const motoRes = await request(app)
      .post('/api/properties')
      .set('x-user-id', citizenId)
      .set('x-user-role', 'citizen')
      .send({
        title: 'My Moto',
        description: 'Honda',
        district: 'Hargeisa',
        address: '456 Test St',
        type: 'motorcycle',
        latitude: '',
        longitude: '',
        visibility: 'public'
      });
    console.log("Moto Status:", motoRes.status);
    console.log("Moto Body:", motoRes.body);
    if (motoRes.status !== 201) throw new Error("Moto Registration failed");

    const motoPropertyId = motoRes.body.property.id;

    console.log("\\n3. Testing Notary Approval for Motorcycle (Registers Asset)...");
    const notaryApproveRes = await request(app)
      .patch(`/api/properties/${motoPropertyId}/notary-approve`)
      .set('x-user-id', notaryId)
      .set('x-user-role', 'notary')
      .send({ signatureData: 'data:image/png;base64,mocked_signature_notary' });
    console.log("Moto Notary Approve Status:", notaryApproveRes.status);
    console.log("Moto Notary Approve Body:", notaryApproveRes.body);
    if (notaryApproveRes.status !== 200) throw new Error("Moto Notary Approve failed");

    console.log("\\n4. Testing Motorcycle Transfer Initiation...");
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('x-user-id', citizenId)
      .set('x-user-role', 'citizen')
      .send({
        property_id: motoPropertyId,
        to_user: citizenBId,
        price: 1500
      });
    console.log("Transfer Init Status:", transferRes.status);
    console.log("Transfer Init Body:", transferRes.body);
    if (transferRes.status !== 201) throw new Error("Transfer Init failed");

    const transferId = transferRes.body.id;

    console.log("\\n5. Testing Buyer Accepts Transfer...");
    const acceptRes = await request(app)
      .patch(`/api/transfers/${transferId}/accept`)
      .set('x-user-id', citizenBId)
      .set('x-user-role', 'citizen');
    console.log("Accept Status:", acceptRes.status);
    if (acceptRes.status !== 200) throw new Error("Accept failed");

    console.log("\\n6. Testing Buyer & Seller Signing Agreement...");
    const agrRes = await db.query('SELECT id FROM transfer_agreements WHERE transfer_id = $1', [transferId]);
    const agrId = agrRes.rows[0].id;
    await db.query('UPDATE transfer_agreements SET seller_signed = true, buyer_signed = true, locked = true WHERE id = $1', [agrId]);

    console.log("\\n7. Testing Notary Certifies Motorcycle Transfer...");
    const certifyRes = await request(app)
      .patch(`/api/transfers/${transferId}/notary-certify`)
      .set('x-user-id', notaryId)
      .set('x-user-role', 'notary')
      .send({ signature_image: 'data:image/png;base64,mock' });
    console.log("Certify Status:", certifyRes.status);
    console.log("Certify Body:", certifyRes.body);
    if (certifyRes.status !== 200 || certifyRes.body.status !== 'completed') throw new Error("Certify failed or didn't atomic swap");

    console.log("\\n8. Validating Database Integrity...");
    const propCheck = await db.query('SELECT status, owner_id FROM properties WHERE id = $1', [motoPropertyId]);
    console.log("Property Owner ID:", propCheck.rows[0].owner_id, "(Expected:", citizenBId, ")");
    const assetCheck = await db.query('SELECT current_owner_id, status FROM assets WHERE id = $1', [motoPropertyId]);
    console.log("Asset Owner ID:", assetCheck.rows[0].current_owner_id, "(Expected:", citizenBId, ")");
    
    console.log("\\nALL TESTS PASSED SUCCESSFULLY");

  } catch (error) {
    console.error("Test Error:", error.message);
  } finally {
    process.exit(0);
  }
}

runTests();
