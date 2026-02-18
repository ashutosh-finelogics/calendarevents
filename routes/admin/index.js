const express = require('express');
const router = express.Router();
const dashboard = (req, res) => res.redirect('/admin/calendar/page');
const { isLoggedIn } = require('../../middleware/index');

router.get('/', isLoggedIn, dashboard);

module.exports = router;
