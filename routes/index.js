const express = require('express');
const router = express.Router();
const authentication = require('../controllers/authentication');
const { loginPage } = require('../middleware/index');

router.get('/', loginPage, (req, res) => authentication.loginView(req, res));
router.post('/login', (req, res) => authentication.postLogin(req, res));

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Unable to log out');
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
