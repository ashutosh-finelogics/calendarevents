/**
 * Calendar service - Google Directory (employees) and Google Calendar (events).
 * Requires account.json (service account) and domain-wide delegation for indiaontrack.in.
 */

const path = require('path');
const { google } = require('googleapis');
const keys = require('../../../config/keys');
const { Console } = require('console');

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'calendaraccount.json');
const DOMAIN = keys.GOOGLE_DOMAIN || 'indiaontrack.in';
const ADMIN_EMAIL = keys.GOOGLE_ADMIN_EMAIL || `admin@${DOMAIN}`;

console.log('CREDENTIALS_PATH: ' + CREDENTIALS_PATH);
console.log('DOMAIN: ' + DOMAIN);
console.log('ADMIN_EMAIL: ' + ADMIN_EMAIL);

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

async function listDomainUsers() {
  console.log('listDomainUsers');
  const auth = getAuth(ADMIN_EMAIL, ['https://www.googleapis.com/auth/admin.directory.user.readonly']);
  console.log('auth: ' + auth);
  await auth.authorize();
  const admin = google.admin({ version: 'directory_v1', auth });
  const res = await admin.users.list({
    customer: 'my_customer',
    domain: DOMAIN,
    maxResults: 500,
    orderBy: 'email'
  });
  const users = (res.data.users || []).map((u) => ({
    id: u.id,
    email: u.primaryEmail,
    name: (u.name ? [u.name.givenName, u.name.familyName].filter(Boolean).join(' ').trim() : null) || u.primaryEmail
  }));
  return users;
}

async function getCalendarEventsForDate(userEmail, dateStr) {
  console.log('getCalendarEventsForDate'+userEmail+' '+dateStr);
  //userEmail = 'developers@indiaontrack.in';
  //https://www.googleapis.com/auth/calendar 
  //https://www.googleapis.com/auth/calendar.events
  //
  const auth = getAuth(userEmail, ['https://www.googleapis.com/auth/calendar.events']);
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
  const events = (res.data.items || []).map((e) => {
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
  return events;
}

module.exports = {
  listDomainUsers,
  getCalendarEventsForDate
};
