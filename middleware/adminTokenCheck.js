/**
 * Admin Token Check - validates session and tokens for all /admin/* routes.
 * Login is mandatory: if not logged in or tokens invalid, redirects to / (login page).
 * Calls API validate-tokens to refresh if needed.
 */

const logger = require('../utils/logger');
const keys = require('../config/keys');
const axios = require('axios');

const adminTokenCheck = async (req, res, next) => {
  try {
    if (!req.session) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ status: false, message: 'Session not found. Please log in again.', error: 'SESSION_NOT_FOUND', redirect: '/' });
      }
      return res.redirect('/');
    }
    if (!req.session.is_login) {
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ status: false, message: 'Please log in.', error: 'NOT_LOGGED_IN', redirect: '/' });
      }
      return res.redirect('/');
    }

    const accessToken = req.session.access_token;
    const refreshToken = req.session.refresh_token;
    if (!accessToken && !refreshToken) {
      return handleLogout(req, res, 'Access token not found. Please log in again.', 'ACCESS_TOKEN_NOT_FOUND');
    }

    const baseUrl = (keys.ADMIN_API_URL || keys.APP_API_URL || '').replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/auth/validate-tokens`;
    const response = await axios.post(url, { access_token: accessToken || null, refresh_token: refreshToken }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.data && response.data.status === true) {
      req.session.access_token = response.data.access_token;
      req.session.refresh_token = response.data.refresh_token;
      return next();
    }
    return handleLogout(req, res, response.data?.message || 'Session expired. Please log in again.', 'TOKEN_VALIDATION_FAILED');
  } catch (error) {
    logger.error('Admin Token Check Error:', error.message);
    const msg = error.response?.data?.message || 'Unable to validate tokens. Please log in again.';
    return handleLogout(req, res, msg, 'TOKEN_VALIDATION_FAILED');
  }
};

function handleLogout(req, res, message, errorCode) {
  const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
  if (isAjax) {
    req.session.destroy(() => {});
    res.clearCookie('connect.sid');
    return res.status(401).json({ status: false, message, error: errorCode, redirect: '/' });
  }
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Unable to log out');
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
}

module.exports = adminTokenCheck;
