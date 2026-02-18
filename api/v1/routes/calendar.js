const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const apiAuth = require('../../middleware/auth');

//todo: uncomment this when authentication is implemented
router.use(apiAuth);
router.get('/employees', calendarController.employeesList);
router.get('/events', calendarController.eventsByDate);

module.exports = router;
