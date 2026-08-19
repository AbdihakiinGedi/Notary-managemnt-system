const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.full_name, account_status: 'verified', verified: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const citizenId = uuidv4();
const citizenBId = uuidv4();
const notaryId = uuidv4();

const cToken = generateToken({ id: citizenId, email: 'a@test.com', role: 'citizen', full_name: 'Citizen A' });
const cbToken = generateToken({ id: citizenBId, email: 'b@test.com', role: 'citizen', full_name: 'Citizen B' });
const nToken = generateToken({ id: notaryId, email: 'n@test.com', role: 'notary', full_name: 'Notary' });

async function setup() {
  await db.query(`DELETE FROM users WHERE email IN ('a@test.com', 'b@test.com', 'n@test.com')`);
  await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash, account_status) VALUES ($1, $2, $3, $4, 1, 'photo.jpg', 'hash', 'verified')`, [citizenId, 'NAT-'+Date.now(), 'Citizen A', 'a@test.com']);
  await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash, account_status) VALUES ($1, $2, $3, $4, 1, 'photo.jpg', 'hash', 'verified')`, [citizenBId, 'NAT-'+Date.now()+1, 'Citizen B', 'b@test.com']);
  await db.query(`INSERT INTO users (id, national_id, full_name, email, role_id, profile_photo, password_hash, account_status) VALUES ($1, $2, $3, $4, 2, 'photo.jpg', 'hash', 'verified')`, [notaryId, 'NAT-'+Date.now()+2, 'Notary', 'n@test.com']);
  console.log(JSON.stringify({cToken, cbToken, nToken, citizenId, citizenBId, notaryId}));
  process.exit(0);
}
setup();
