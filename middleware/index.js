const isLoggedIn = (req, res, next) => {
  if (req.session && req.session.is_login) {
    return next();
  }
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
    return res.status(401).json({ status: false, message: 'Session expired. Please log in again.' });
  }
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Unable to log out');
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

const loginPage = (req, res, next) => {
  if (!req.session || !req.session.is_login) return next();
  res.redirect('/admin');
};

module.exports = { isLoggedIn, loginPage };
