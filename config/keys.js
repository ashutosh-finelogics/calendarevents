require('dotenv').config();

module.exports = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'calendar_tracking',

  PORT: process.env.PORT || 3002,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',
  SESSION_VALIDITY: parseInt(process.env.SESSION_VALIDITY || '1440', 10),

  ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://localhost:3002',
  APP_API_URL: process.env.APP_API_URL || 'http://localhost:3002',

  ACCESS_SECRET: {
    SECRET: process.env.ACCESS_SECRET || 'CalendarTrackingAccessSecret',
    WEB_EXPIRATION: process.env.ACCESS_EXPIRATION || '1h'
  },
  REFRESH_SECRET: {
    SECRET: process.env.REFRESH_SECRET || 'CalendarTrackingRefreshSecret',
    WEB_EXPIRATION: process.env.REFRESH_EXPIRATION || '7d',
    WEB_EXPIRATION_TYPE: 'days'
  },

  GOOGLE_DOMAIN: process.env.GOOGLE_DOMAIN || 'indiaontrack.in',
  GOOGLE_ADMIN_EMAIL: process.env.GOOGLE_ADMIN_EMAIL || 'admin@indiaontrack.in'
};
