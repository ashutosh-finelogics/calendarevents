const express = require('express');
const router = express.Router();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.use('/v1', require('../v1/routes'));

router.get('/health', (req, res) => {
  res.json({ status: true, message: 'API is running', version: '1.0.0' });
});

module.exports = router;
