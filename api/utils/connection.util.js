const mysql = require('mysql2/promise');
const keys = require('../../config/keys');

const pool = mysql.createPool({
  host: keys.DB_HOST,
  user: keys.DB_USER,
  password: keys.DB_PASSWORD,
  database: keys.DB_NAME,
  port: keys.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = { pool };
