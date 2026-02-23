/**
 * Calendar service - Configured users from XML, Google Calendar events.
 * Requires calendaraccount.json and domain-wide delegation.
 */

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const keys = require('../../../config/keys');

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'calendaraccount.json');
const USERS_XML_PATH = path.resolve(process.cwd(), 'config', 'users.xml');
// Use broad scope - must match exactly what is added in Workspace Admin → Domain Wide Delegation
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

function getAuth(subjectEmail, scopes) {
  try {
    const credentials = require(CREDENTIALS_PATH);
    return new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      scopes,
      subjectEmail || null
    );
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error('calendaraccount.json not found. Add Google service account key in project root.');
    }
    throw err;
  }
}

/**
 * Read configured users from config/users.xml.
 * New format (preferred):
 *   <users>
 *     <user>
 *       <email>email@domain.com</email>
 *       <name>Employee Name</name>
 *     </user>
 *   </users>
 *
 * Backward compatible with old format:
 *   <users><user>email@domain.com</user></users>
 */
function getConfiguredUsers() {
  let xml = '';
  try {
    xml = fs.readFileSync(USERS_XML_PATH, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('config/users.xml not found. Create it with <users><user><email>user@domain.com</email><name>Full Name</name></user></users>');
    }
    throw err;
  }
  const users = [];
  // Match each <user>...</user> block
  const userRe = /<user[^>]*>([\s\S]*?)<\/user>/gi;
  let m;
  while ((m = userRe.exec(xml)) !== null) {
    const block = m[1] || '';
    let email = null;
    let name = null;

    // New format: explicit <email> and <name> tags
    const emailMatch = /<email>([^<]+)<\/email>/i.exec(block);
    const nameMatch = /<name>([^<]+)<\/name>/i.exec(block);
    if (emailMatch) email = emailMatch[1].trim();
    if (nameMatch) name = nameMatch[1].trim();

    // Backward-compatible: plain text inside <user> if no <email> tag
    if (!email) {
      const plain = block.replace(/<[^>]+>/g, '').trim();
      if (plain) email = plain;
    }

    if (email) {
      users.push({ email, name: name || null });
    }
  }
  return users;
}

async function listDomainUsers() {
  return getConfiguredUsers();
}

async function getCalendarEventsForDate(userEmail, dateStr) {
  const auth = getAuth(userEmail, [CALENDAR_SCOPE]);
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  const timeMin = new Date(dateStr + 'T00:00:00Z');
  const timeMax = new Date(dateStr + 'T23:59:59.999Z');
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  return (res.data.items || []).map((e) => {
    const start = e.start?.dateTime || e.start?.date;
    const end = e.end?.dateTime || e.end?.date;
    return {
      id: e.id,
      summary: e.summary || '(No title)',
      start,
      end,
      allDay: !e.start?.dateTime,
      description: e.description || null,
      location: e.location || null,
      creator: e.creator?.email || null,
      status: e.status || null
    };
  });
}

/**
 * Get events for one user for entire month (for detail view).
 */
async function getCalendarEventsForMonth(userEmail, year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const timeMin = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const timeMax = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const auth = getAuth(userEmail, [CALENDAR_SCOPE]);
  await auth.authorize();
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  return (res.data.items || []).map((e) => {
    const start = e.start?.dateTime || e.start?.date;
    const end = e.end?.dateTime || e.end?.date;
    return {
      id: e.id,
      summary: e.summary || '(No title)',
      start,
      end,
      allDay: !e.start?.dateTime,
      description: e.description || null,
      location: e.location || null,
      creator: e.creator?.email || null,
      status: e.status || null
    };
  });
}

/**
 * Get events for all configured users for a single date (for main list view).
 */
async function getEventsForAllUsersByDate(dateStr) {
  const users = getConfiguredUsers();
  const results = [];
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    try {
      const events = await getCalendarEventsForDate(u.email, dateStr);
      results.push({ email: u.email, name: u.name || null, events });
    } catch (err) {
      results.push({ email: u.email, name: u.name || null, events: [], error: err.message });
    }
  }
  return results;
}

module.exports = {
  getConfiguredUsers,
  listDomainUsers,
  getCalendarEventsForDate,
  getCalendarEventsForMonth,
  getEventsForAllUsersByDate
};
