const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');

const generateAccessToken = (payload, type = 'web') => {
  const secret = keys.ACCESS_SECRET.SECRET;
  const expiration = keys.ACCESS_SECRET.WEB_EXPIRATION || '1h';
  return jwt.sign(payload, secret, { expiresIn: expiration });
};

const generateRefreshToken = (payload, type = 'web') => {
  const secret = keys.REFRESH_SECRET.SECRET;
  const expiration = keys.REFRESH_SECRET.WEB_EXPIRATION || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiration });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, keys.ACCESS_SECRET.SECRET);
  } catch (e) {
    throw new Error('Invalid or expired access token');
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, keys.REFRESH_SECRET.SECRET);
  } catch (e) {
    throw new Error('Invalid or expired refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
