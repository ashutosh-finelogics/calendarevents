const { verifyAccessToken } = require('../utils/token.util');

const apiAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (!token) {
        return res.status(401).json({ status: false, message: 'Access token is required', error: 'UNAUTHORIZED' });
      }
      try {
        const decoded = verifyAccessToken(token);
        if (!decoded || !decoded.user_id) {
          return res.status(401).json({ status: false, message: 'Invalid token format', error: 'UNAUTHORIZED' });
        }
        req.apiUser = { id: decoded.user_id, email: decoded.email || 'developes@indiaontrack.in', type: 'admin' };
        return next();
      } catch (tokenError) {
        return res.status(401).json({ status: false, message: tokenError.message || 'Invalid or expired token', error: 'UNAUTHORIZED' });
      }
    }
    if (req.session && req.session.is_login) {
      req.apiUser = {
        id: req.session.auth_uid,
        name: req.session.auth_dname,
        email: req.session.auth_email,
        type: 'admin'
      };
      return next();
    }
    return res.status(401).json({ status: false, message: 'Authentication required.', error: 'UNAUTHORIZED' });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Authentication error', error: 'INTERNAL_SERVER_ERROR' });
  }
};

module.exports = apiAuth;
