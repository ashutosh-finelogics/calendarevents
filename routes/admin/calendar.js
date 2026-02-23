const express = require('express');
const router = express.Router();
const {
  calendarPage,
  detailPage,
  configuredUsers,
  eventsByDate,
  eventsMonth,
  employeesList,
  eventsList
} = require('../../controllers/admin/calendar');
const { isLoggedIn } = require('../../middleware/index');

router.get('/page', isLoggedIn, calendarPage);
router.get('/detail', isLoggedIn, detailPage);
router.get('/configured-users', isLoggedIn, configuredUsers);
router.get('/events-by-date', isLoggedIn, eventsByDate);
router.get('/events-month', isLoggedIn, eventsMonth);
router.get('/employees', isLoggedIn, employeesList);
router.get('/events', isLoggedIn, eventsList);

module.exports = router;
