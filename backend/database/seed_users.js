const { Client } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const roles = [
  { "id": 1, "name": "citizen" },
  { "id": 2, "name": "officer" },
  { "id": 3, "name": "notary" },
  { "id": 4, "name": "admin" }
];

async function seedUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database. Seeding roles and admin user...');

    // Seed Roles
    for (const role of roles) {
      await client.query(
        'INSERT INTO roles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name',
        [role.id, role.name]
      );
    }
    console.log('✅ Roles seeded.');

    // Hash the password dynamically
    const passwordHash = await bcrypt.hash('123456', 10);

    const adminUser = {
      "id": "8f5a5283-f6ff-48b9-815f-be7b94d72ee6",
      "full_name": "System Administrator",
      "email": "admin@gov.so",
      "password_hash": passwordHash,
      "role_id": 4,
      "phone": "+252610000000",
      "is_active": true,
      "created_at": new Date().toISOString(),
      "status": "active",
      "national_id": "NAT-ADMIN-001",
      "profile_photo": null,
      "id_document_url": null,
      "verification_status": "verified",
      "verification_type": "national_id",
      "verification_number": "NAT-ADMIN-001",
      "verification_document": null,
      "account_status": "verified",
      "verified": true,
      "approved_by": null,
      "approved_at": new Date().toISOString(),
      "rejection_reason": null
    };

    await client.query(
      `INSERT INTO users (
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
        rejection_reason = EXCLUDED.rejection_reason`,
      [
        adminUser.id, adminUser.full_name, adminUser.email, adminUser.password_hash, adminUser.role_id, adminUser.phone, adminUser.is_active,
        adminUser.created_at, adminUser.status, adminUser.national_id, adminUser.profile_photo, adminUser.id_document_url,
        adminUser.verification_status, adminUser.verification_type, adminUser.verification_number,
        adminUser.verification_document, adminUser.account_status, adminUser.verified, adminUser.approved_by,
        adminUser.approved_at, adminUser.rejection_reason
      ]
    );
    
    console.log('✅ Admin user seeded successfully! System is ready for login.');

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedUsers();
