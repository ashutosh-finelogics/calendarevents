const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/calendar', require('./calendar'));

module.exports = router;
