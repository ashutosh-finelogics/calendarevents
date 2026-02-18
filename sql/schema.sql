CREATE DATABASE IF NOT EXISTS calendar_tracking;
USE calendar_tracking;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Run: node scripts/seed-admin.js to create default admin (admin@indiaontrack.in / Admin@123)
