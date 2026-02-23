const calendarService = require('../services/calendarService');
const logger = require('../../../utils/logger');

/** GET /api/v1/calendar/configured-users - list from config/users.xml */
const configuredUsers = async (req, res) => {
  try {
    const data = await calendarService.getConfiguredUsers();
    return res.status(200).json({ status: 'success', message: 'Configured users', data });
  } catch (error) {
    logger.error('calendarController.configuredUsers', error.message);
    const code = error.message && error.message.includes('users.xml') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load users' });
  }
};

/** GET /api/v1/calendar/employees - same as configured-users (for backward compatibility) */
const employeesList = async (req, res) => {
  try {
    const data = await calendarService.getConfiguredUsers();
    return res.status(200).json({ status: 'success', message: 'Employees list', data });
  } catch (error) {
    logger.error('calendarController.employeesList', error.message);
    const code = error.message && error.message.includes('users.xml') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load employees' });
  }
};

/** GET /api/v1/calendar/events?email=xxx&date=YYYY-MM-DD - one user one date */
const eventsByDate = async (req, res) => {
  const email = req.query.email;
  const date = req.query.date;
  if (!email || !date) {
    return res.status(400).json({ status: 'error', message: 'Query params email and date (YYYY-MM-DD) are required.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  try {
    const data = await calendarService.getCalendarEventsForDate(email.trim(), date);
    return res.status(200).json({ status: 'success', message: 'Events for date', data, date });
  } catch (error) {
    logger.error('calendarController.eventsByDate', error.message);
    const code = error.message && error.message.includes('calendaraccount') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load events' });
  }
};

/** GET /api/v1/calendar/events-by-date?date=YYYY-MM-DD - all configured users, time-wise events for that date */
const eventsByDateAll = async (req, res) => {
  const date = req.query.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ status: 'error', message: 'Query param date (YYYY-MM-DD) is required.' });
  }
  try {
    const data = await calendarService.getEventsForAllUsersByDate(date);
    return res.status(200).json({ status: 'success', message: 'Events by date for all users', data, date });
  } catch (error) {
    logger.error('calendarController.eventsByDateAll', error.message);
    const code = error.message && error.message.includes('calendaraccount') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load events' });
  }
};

/** GET /api/v1/calendar/events-month?email=xxx&year=2025&month=1 - one user entire month (for detail view) */
const eventsMonth = async (req, res) => {
  const email = req.query.email;
  const year = req.query.year;
  const month = req.query.month;
  if (!email || !year || !month) {
    return res.status(400).json({ status: 'error', message: 'Query params email, year and month are required.' });
  }
  try {
    const data = await calendarService.getCalendarEventsForMonth(email.trim(), year, month);
    return res.status(200).json({ status: 'success', message: 'Events for month', data, year, month });
  } catch (error) {
    logger.error('calendarController.eventsMonth', error.message);
    const code = error.message && error.message.includes('calendaraccount') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load events' });
  }
};

module.exports = {
  configuredUsers,
  employeesList,
  eventsByDate,
  eventsByDateAll,
  eventsMonth
};
