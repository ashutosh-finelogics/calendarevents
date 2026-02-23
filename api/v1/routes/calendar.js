const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const apiAuth = require('../../middleware/auth');

router.use(apiAuth);
router.get('/configured-users', calendarController.configuredUsers);
router.get('/employees', calendarController.employeesList);
router.get('/events', calendarController.eventsByDate);
router.get('/events-by-date', calendarController.eventsByDateAll);
router.get('/events-month', calendarController.eventsMonth);

module.exports = router;
