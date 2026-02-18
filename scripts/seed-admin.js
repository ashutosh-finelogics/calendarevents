require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const keys = require('../config/keys');

const EMAIL = 'admin@indiaontrack.in';
const PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

async function seed() {
  const conn = await mysql.createConnection({
    host: keys.DB_HOST,
    user: keys.DB_USER,
    password: keys.DB_PASSWORD,
    database: keys.DB_NAME,
    port: keys.DB_PORT
  });
  const hash = await bcrypt.hash(PASSWORD, 10);
  await conn.execute(
    'INSERT INTO admins (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
    [EMAIL, hash]
  );
  console.log('Admin seeded:', EMAIL);
  process.exit(0);
}

seed().catch(function(err) {
  console.error(err);
  process.exit(1);
});
