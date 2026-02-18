const express = require('express');
const router = express.Router();
const {
  calendarPage,
  employeesList,
  eventsList
} = require('../../controllers/admin/calendar');
const { isLoggedIn } = require('../../middleware/index');

router.get('/page', isLoggedIn, calendarPage);
router.get('/employees', isLoggedIn, employeesList);
router.get('/events', isLoggedIn, eventsList);

module.exports = router;
