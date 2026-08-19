-- Realistic Seed Data for Land Registry
-- All passwords are 'Password123' (bcrypt hash: $2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he)

-- Citizens
INSERT INTO users (id, full_name, email, password_hash, role_id, phone) VALUES
('f1000000-0000-0000-0000-000000000001', 'Ahmed Hassan', 'ahmed@example.com', '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he', 1, '+252 615 111 222'),
('f1000000-0000-0000-0000-000000000002', 'Fatima Ali', 'fatima@example.com', '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he', 1, '+252 615 222 333');

-- Land Officers
INSERT INTO users (id, full_name, email, password_hash, role_id) VALUES
('f2000000-0000-0000-0000-000000000001', 'Officer Mohamed', 'officer@example.com', '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he', 2);

-- Notaries
INSERT INTO users (id, full_name, email, password_hash, role_id) VALUES
('f3000000-0000-0000-0000-000000000001', 'Sahra Ibrahim (Notary)', 'notary@example.com', '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he', 3);

-- Admins
INSERT INTO users (id, full_name, email, password_hash, role_id) VALUES
('f5000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@example.com', '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he', 4);

-- Sample Properties
INSERT INTO properties (id, title, description, district, address, owner_id, status) VALUES
('f6000000-0000-0000-0000-000000000001', 'Hodan Residential Villa', 'Large 4-bedroom villa with garden.', 'Hodan', 'Wadada Tarbuunka, Mogadishu', 'f1000000-0000-0000-0000-000000000001', 'registered'),
('f6000000-0000-0000-0000-000000000002', 'Commercial Plot - Hamar Weyne', 'Prime location for retail development.', 'Hamar Weyne', 'Via Roma, Mogadishu', 'f1000000-0000-0000-0000-000000000002', 'pending');

-- Sample Notification
INSERT INTO notifications (user_id, title, message) VALUES
('f1000000-0000-0000-0000-000000000001', 'Welcome to SNDNPRS', 'Your account has been successfully verified.');
