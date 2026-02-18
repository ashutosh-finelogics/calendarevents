const calendarService = require('../services/calendarService');
const logger = require('../../../utils/logger');
const { Console } = require('winston/lib/winston/transports');

const employeesList = async (req, res) => {
  try {
      console.log('employeesList');
    const data = await calendarService.listDomainUsers();
    console.log('data: ' + data);
    return res.status(200).json({ status: 'success', message: 'Employees list', data });
  } catch (error) {
    logger.error('calendarController.employeesList', error.message);
    const code = error.message && error.message.includes('account.json') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load employees' });
  }
};

const eventsByDate = async (req, res) => {
  const email = req.query.email;
  const date = req.query.date;
  if (!email || !date) {
    return res.status(400).json({ status: 'error', message: 'Query params email and date (YYYY-MM-DD) are required.' });
  }
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!dateMatch) {
    return res.status(400).json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD.' });
  }
  try {
    const data = await calendarService.getCalendarEventsForDate(email.trim(), date);
    return res.status(200).json({ status: 'success', message: 'Events for date', data, date });
  } catch (error) {
    logger.error('calendarController.eventsByDate', error.message);
    const code = error.message && error.message.includes('account.json') ? 503 : 500;
    return res.status(code).json({ status: 'error', message: error.message || 'Failed to load events' });
  }
};

module.exports = { employeesList, eventsByDate };
