const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function generateSeed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Fetch Roles
    const rolesRes = await client.query('SELECT * FROM roles ORDER BY id');
    const roles = rolesRes.rows;

    // Fetch Users
    const usersRes = await client.query('SELECT * FROM users ORDER BY created_at');
    const users = usersRes.rows;

    const seedContent = `const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const roles = ${JSON.stringify(roles, null, 2)};
const users = ${JSON.stringify(users, null, 2)};

async function seedUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database. Seeding roles and users...');

    // Seed Roles
    for (const role of roles) {
      await client.query(
        'INSERT INTO roles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
        [role.id, role.name]
      );
    }
    console.log('✅ Roles seeded.');

    // Seed Users
    for (const u of users) {
      await client.query(
        \\\`INSERT INTO users (
          id, full_name, email, password_hash, role_id, phone, is_active, 
          created_at, status, national_id, profile_photo, id_document_url, 
          verification_status, verification_type, verification_number, 
          verification_document, account_status, verified, approved_by, 
          approved_at, rejection_reason
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) ON CONFLICT (id) DO UPDATE SET 
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          phone = EXCLUDED.phone,
          is_active = EXCLUDED.is_active,
          status = EXCLUDED.status,
          national_id = EXCLUDED.national_id,
          profile_photo = EXCLUDED.profile_photo,
          id_document_url = EXCLUDED.id_document_url,
          verification_status = EXCLUDED.verification_status,
          verification_type = EXCLUDED.verification_type,
          verification_number = EXCLUDED.verification_number,
          verification_document = EXCLUDED.verification_document,
          account_status = EXCLUDED.account_status,
          verified = EXCLUDED.verified,
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          rejection_reason = EXCLUDED.rejection_reason\\\`,
        [
          u.id, u.full_name, u.email, u.password_hash, u.role_id, u.phone, u.is_active,
          u.created_at, u.status, u.national_id, u.profile_photo, u.id_document_url,
          u.verification_status, u.verification_type, u.verification_number,
          u.verification_document, u.account_status, u.verified, u.approved_by,
          u.approved_at, u.rejection_reason
        ]
      );
    }
    
    console.log('✅ Users seeded successfully! System is ready for login.');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedUsers();
`;

    fs.writeFileSync(path.join(__dirname, 'seed_users.js'), seedContent);
    console.log('✅ Successfully generated seed_users.js with real data from the database.');

  } catch (error) {
    console.error('❌ Error generating seed:', error);
  } finally {
    await client.end();
  }
}

generateSeed();
