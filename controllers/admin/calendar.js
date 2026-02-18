/**
 * Admin Calendar Controller
 * Serves calendar page and proxies employees/events to API via apiService (session token).
 */

const { getProtocol } = require('../../utils/core.util');
const { templateExtrasCss, templateExtrasJS } = require('../../helpers/includeHelper');
const apiService = require('../../utils/apiService');

const API_CALENDAR = '/api/v1/calendar';
const getToken = (req) => (req.session && req.session.access_token ? req.session.access_token : '');

/**
 * Calendar page - employee select, date selector, events list, prev/next day
 * GET /admin/calendar/page
 */
exports.calendarPage = async (req, res) => {
  const protocol = await getProtocol(req);
  const base_url = protocol + '://' + req.get('host');
  const js = templateExtrasJS();
  js.page.push('/javascripts/admin/calendar/page.js');
  const viewData = {
    path: 'admin/calendar/page',
    css: templateExtrasCss(),
    js,
    title: 'Calendar Tracking',
    base_url,
    username: req.session.auth_dname,
    message: req.flash('message') || ''
  };
  res.render('admin', viewData);
};

/**
 * Employees list (proxy to API) - for employee dropdown
 * GET /admin/calendar/employees
 */
exports.employeesList = async (req, res) => {
  try {
    const token = getToken(req);
    console.log('token: ' + token);
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/employees`, 'GET', null, token);
    if (!result.success) {
      return res.status(result.status || 500).json({
        status: false,
        message: result.message || 'Failed to load employees',
        data: []
      });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({ status: 'success', data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load employees', data: [] });
  }
};

/**
 * Events for employee + date (proxy to API)
 * GET /admin/calendar/events?email=xxx&date=YYYY-MM-DD
 */
exports.eventsList = async (req, res) => {
  try {
    const token = getToken(req);
    const query = { email: req.query.email, date: req.query.date };
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/events`, 'GET', query, token);
    if (!result.success) {
      return res.status(result.status || 500).json({
        status: false,
        message: result.message || 'Failed to load events',
        data: []
      });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({
      status: 'success',
      data: Array.isArray(data) ? data : [],
      date: result.data.date || req.query.date
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load events', data: [] });
  }
};
