const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../utils/token.util');

const ALLOWED_EMAIL = 'developes@indiaontrack.in';

const login = async (req, res) => {
  try {
    const email = (req.body && req.body.email) ? String(req.body.email).trim().toLowerCase() : '';
    if (email !== ALLOWED_EMAIL) {
      return res.status(401).json({ status: false, message: 'Invalid email or password.' });
    }
    const payload = { user_id: 1, email: ALLOWED_EMAIL, type: 'admin' };
    const access_token = generateAccessToken(payload);
    const refresh_token = generateRefreshToken(payload);
    return res.status(200).json({
      status: true,
      message: 'Login successful',
      access_token,
      refresh_token,
      data: { u_id: 1, u_dname: 'Admin', u_email: ALLOWED_EMAIL }
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Login failed.' });
  }
};

const validateTokens = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body || {};
    if (access_token) {
      try {
        const decoded = verifyAccessToken(access_token);
        const payload = { user_id: decoded.user_id, email: decoded.email, type: 'admin' };
        const newAccess = generateAccessToken(payload);
        const newRefresh = generateRefreshToken(payload);
        return res.status(200).json({ status: true, access_token: newAccess, refresh_token: newRefresh });
      } catch (e) {
        // access invalid, try refresh
      }
    }
    if (refresh_token) {
      try {
        const decoded = verifyRefreshToken(refresh_token);
        const payload = { user_id: decoded.user_id, email: decoded.email, type: 'admin' };
        const newAccess = generateAccessToken(payload);
        const newRefresh = generateRefreshToken(payload);
        return res.status(200).json({ status: true, access_token: newAccess, refresh_token: newRefresh });
      } catch (e) {
        return res.status(401).json({ status: false, message: 'Session expired. Please log in again.' });
      }
    }
    return res.status(401).json({ status: false, message: 'Tokens required.' });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message || 'Validation failed.' });
  }
};

module.exports = { login, validateTokens };
