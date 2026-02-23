/**
 * Admin Calendar Controller
 * Serves calendar page (configured users + time-wise events) and detail page (month view).
 * All data via apiService (session token) - no direct DB/Google calls here.
 */

const { getProtocol } = require('../../utils/core.util');
const { templateExtrasCss, templateExtrasJS } = require('../../helpers/includeHelper');
const apiService = require('../../utils/apiService');
const fs = require('fs');
const path = require('path');

const API_CALENDAR = '/api/v1/calendar';
const getToken = (req) => (req.session && req.session.access_token ? req.session.access_token : '');

function parseTimeToMinutes(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  // If specifically 23:59, treat as end-of-day (24:00) to simplify ranges.
  if (h === 23 && min === 59) return 24 * 60;
  return h * 60 + min;
}

function buildSlotsFromConfig(startMinutes, endMinutes, slotMinutes) {
  const slots = [];
  const start = typeof startMinutes === 'number' ? startMinutes : 0;
  const end = typeof endMinutes === 'number' ? endMinutes : 24 * 60;
  const step = slotMinutes && slotMinutes > 0 ? slotMinutes : 60;
  const fmt = (mins) => {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    if (h === 24) h = 0;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };
  for (let cur = start; cur < end; cur += step) {
    const next = Math.min(cur + step, end);
    slots.push({
      startMinutes: cur,
      endMinutes: next,
      label: fmt(cur) + '–' + fmt(next)
    });
  }
  return slots;
}

function getSlotConfig() {
  const xmlPath = path.resolve(process.cwd(), 'config', 'slot-config.xml');
  let xml = '';
  try {
    xml = fs.readFileSync(xmlPath, 'utf8');
  } catch (err) {
    // Fallback to default 00:00–23:59, 60-minute slots
    return buildSlotsFromConfig(0, 24 * 60, 60);
  }
  const startMatch = /<starttime>([^<]+)<\/starttime>/i.exec(xml);
  const endMatch = /<endtime>([^<]+)<\/endtime>/i.exec(xml);
  const slotMatch = /<slotdurationinminutes>([^<]+)<\/slotdurationinminutes>/i.exec(xml);

  const startMinutes = parseTimeToMinutes(startMatch && startMatch[1]);
  const endMinutes = parseTimeToMinutes(endMatch && endMatch[1]);
  const slotMinutes = slotMatch ? parseInt(slotMatch[1], 10) || 60 : 60;

  return buildSlotsFromConfig(startMinutes, endMinutes, slotMinutes);
}

/**
 * Main calendar page - date selector, scrollable list of configured users with time-wise events
 * GET /admin/calendar/page
 */
exports.calendarPage = async (req, res) => {
  const protocol = await getProtocol(req);
  const base_url = protocol + '://' + req.get('host');
  const js = templateExtrasJS();
  js.page.push('/javascripts/admin/calendar/page.js');
   const slotConfig = getSlotConfig();
  const viewData = {
    path: 'admin/calendar/page',
    css: templateExtrasCss(),
    js,
    title: 'Calendar Tracking',
    base_url,
    username: req.session.auth_dname,
    message: req.flash('message') || '',
    slotConfig,
    slotConfigJson: JSON.stringify(slotConfig || [])
  };
  res.render('admin', viewData);
};

/**
 * Detail page - one user, month-wise events with prev/next month
 * GET /admin/calendar/detail?email=xxx
 */
exports.detailPage = async (req, res) => {
  const protocol = await getProtocol(req);
  const base_url = protocol + '://' + req.get('host');
  const js = templateExtrasJS();
  js.page.push('/javascripts/admin/calendar/detail.js');
  const viewData = {
    path: 'admin/calendar/detail',
    css: templateExtrasCss(),
    js,
    title: 'Calendar - Month View',
    base_url,
    username: req.session.auth_dname,
    message: req.flash('message') || '',
    userEmail: req.query.email || ''
  };
  res.render('admin', viewData);
};

/**
 * Configured users from XML (proxy to API)
 * GET /admin/calendar/configured-users
 */
exports.configuredUsers = async (req, res) => {
  try {
    const token = getToken(req);
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/configured-users`, 'GET', null, token);
    if (!result.success) {
      return res.status(result.status || 500).json({ status: false, message: result.message || 'Failed to load users', data: [] });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({ status: 'success', data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load users', data: [] });
  }
};

/**
 * Events for all configured users for one date (proxy to API)
 * GET /admin/calendar/events-by-date?date=YYYY-MM-DD
 */
exports.eventsByDate = async (req, res) => {
  try {
    const token = getToken(req);
    const query = { date: req.query.date };
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/events-by-date`, 'GET', query, token);
    if (!result.success) {
      return res.status(result.status || 500).json({ status: false, message: result.message || 'Failed to load events', data: [] });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({ status: 'success', data: Array.isArray(data) ? data : [], date: result.data.date || req.query.date });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load events', data: [] });
  }
};

/**
 * Events for one user for entire month (proxy to API) - for detail view
 * GET /admin/calendar/events-month?email=xxx&year=2025&month=1
 */
exports.eventsMonth = async (req, res) => {
  try {
    const token = getToken(req);
    const query = { email: req.query.email, year: req.query.year, month: req.query.month };
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/events-month`, 'GET', query, token);
    if (!result.success) {
      return res.status(result.status || 500).json({ status: false, message: result.message || 'Failed to load events', data: [] });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({
      status: 'success',
      data: Array.isArray(data) ? data : [],
      year: result.data.year || req.query.year,
      month: result.data.month || req.query.month
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load events', data: [] });
  }
};

/** Legacy: employees list (same as configured-users) */
exports.employeesList = async (req, res) => {
  try {
    const token = getToken(req);
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/employees`, 'GET', null, token);
    if (!result.success) {
      return res.status(result.status || 500).json({ status: false, message: result.message || 'Failed to load employees', data: [] });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({ status: 'success', data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load employees', data: [] });
  }
};

/** Legacy: events for one employee one date */
exports.eventsList = async (req, res) => {
  try {
    const token = getToken(req);
    const query = { email: req.query.email, date: req.query.date };
    const result = await apiService.callApiWithToken(`${API_CALENDAR}/events`, 'GET', query, token);
    if (!result.success) {
      return res.status(result.status || 500).json({ status: false, message: result.message || 'Failed to load events', data: [] });
    }
    const data = (result.data && result.data.data) ? result.data.data : [];
    return res.json({ status: 'success', data: Array.isArray(data) ? data : [], date: result.data.date || req.query.date });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message || 'Failed to load events', data: [] });
  }
};
