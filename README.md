## Calendar Tracking - Developer Guide

This project is a small admin web app to see Google Calendar activity for a fixed list of employees, day by day and month by month.

The design is intentionally simple so that it is easy to maintain, even if you do not remember all details later.

---

### 1. High level architecture

- **Tech stack**
  - Backend: Node.js, Express
  - Views: EJS templates + Bootstrap 4 + jQuery
  - Google Calendar access: Service account with domain-wide delegation

- **Request flow**
  1. Browser → `/admin/...` route
  2. `adminTokenCheck` middleware checks session + tokens, refreshes via API if needed
  3. Admin controller (in `controllers/admin/*`) renders EJS and calls `apiService`
  4. `apiService` calls internal REST API under `/api/v1/...` with Bearer token
  5. API controllers (in `api/v1/controllers/*`) call `calendarService`
  6. `calendarService` talks to Google Calendar API

- **No database for users**
  - Configured employees are read from `config/users.xml`
  - Time-slot configuration for the list view is read from `config/slot-config.xml`

---

### 2. Key folders and files

- `app.js`
  - Express app entrypoint
  - Mounts:
    - `/` → login/logout routes
    - `/admin` → admin dashboard/calendar (protected by `adminTokenCheck`)
    - `/api` → API routes

- `controllers/authentication.js`
  - Handles login form and POST `/login`
  - Stores `session.is_login`, `session.access_token`, `session.refresh_token`

- `middleware/adminTokenCheck.js`
  - Runs for **all** `/admin/*` requests
  - If not logged in or tokens invalid → destroys session and redirects to `/` (login)
  - If tokens are close to expiry, calls `/api/v1/auth/validate-tokens` and refreshes them

- `controllers/admin/calendar.js`
  - `calendarPage` – renders main list view
    - Adds `page.js` to the layout
    - Passes:
      - `slotConfig` and `slotConfigJson` from `config/slot-config.xml`
  - `detailPage` – renders single-user month view

- `routes/admin/calendar.js`
  - `/admin/calendar/page` – list view
  - `/admin/calendar/detail` – month view
  - `/admin/calendar/events-by-date` – AJAX for list page
  - `/admin/calendar/events-month` – AJAX for month page

- `api/v1/services/calendarService.js`
  - Reads `config/users.xml`
  - Wraps Google Calendar calls:
    - Events for one day
    - Events for one month
    - Events for all configured users on a date

- `api/v1/controllers/calendarController.js`
  - Simple JSON controllers around `calendarService`

- `views/admin.ejs`
  - Main admin layout
  - Injects:
    - Bootstrap & jQuery
    - Page‑specific JS/CSS via `templateExtras*`
  - Contains `#globalLoader` full-screen spinner with `showGlobalLoader()` / `hideGlobalLoader()`

- `views/admin/calendar/page.ejs`
  - Main list page (configured users)
  - Uses:
    - `slotConfig` and `slotConfigJson` to build time-slot headers and drive JS
  - Contains **two views** (toggled with buttons):
    - **Time slots view** – per-hour grid
    - **Busy / free view** – busy events + free slots per person

- `views/admin/calendar/detail.ejs`
  - Single user month view grid (Google Calendar style)

- `public/javascripts/admin/calendar/page.js`
  - JS for list page
  - Handles:
    - Date selector + prev/next day
    - AJAX `/admin/calendar/events-by-date?date=YYYY-MM-DD`
    - Building:
      - **Time slot grid** (rows = users, columns = configured slots)
      - **Busy / free table**
    - Toggle between the two views

- `public/javascripts/admin/calendar/detail.js`
  - JS for month view
  - Prev/next month, AJAX `/admin/calendar/events-month`

---

### 3. Configuration files

#### 3.1 `config/users.xml`

Employees are configured here. Example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<users>
  <user>
    <email>ashisdas@indiaontrack.in</email>
    <name>Ashis Das</name>
  </user>
  <user>
    <email>sarveshchauhan@indiaontrack.in</email>
    <name>Sarvesh Chauhan</name>
  </user>
</users>
```

- Parsed by `calendarService.getConfiguredUsers()`
- Old format `<user>email@domain.com</user>` still works (name will be `null`)

#### 3.2 `config/slot-config.xml`

Defines the time slots for the **list page**:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<slots>
  <starttime>00:00</starttime>
  <endtime>23:59</endtime>
  <slotdurationinminutes>60</slotdurationinminutes>
</slots>
```

- `starttime` – first time of day (00:00 = 12:00 am)
- `endtime` – last time of day (23:59 is treated as end‑of‑day 24:00)
- `slotdurationinminutes` – width of each slot (e.g. 30 → 00:00–00:30, 00:30–01:00, ...)

Used by:

- `controllers/admin/calendar.js` → `getSlotConfig()`:
  - Parses XML
  - Builds an array:
    - `{ startMinutes, endMinutes, label }`
- `page.ejs`:
  - Builds table header columns using `slot.label`
  - Injects `window.CALENDAR_TIME_SLOTS` for JS
- `page.js`:
  - Uses `TIME_SLOTS` to:
    - Populate per-slot cells in the time‑slot grid
    - Decide which slots are **free** in the busy/free view

#### 3.3 `calendaraccount.json`

Service account key for Google Calendar:

- Must be in project root
- Used by `calendarService.getAuth()`
- Requires Workspace **domain-wide delegation** to:
  - `https://www.googleapis.com/auth/calendar`

---

### 4. List page – views and behaviour

URL: `/admin/calendar/page`

#### 4.1 Time slots view (default)

- Top controls:
  - Date picker (Bootstrap datepicker) – read-only input with popup
  - **Previous day / Next day** buttons
  - **View toggle**:
    - `Time slots` (active) | `Busy / free`

- Table layout:
  - Sticky left columns:
    - `Sr. No`
    - `Employee Name`
    - `Email` (link to detail page)
  - Right side:
    - One column per configured slot from `slot-config.xml`
    - Example header labels: `00:00–01:00`, `01:00–02:00`, ...
  - Rows:
    - One row per configured user
    - Each time-slot cell:
      - Shows all events that overlap that slot (including all‑day)
      - Format: `HH:MM – HH:MM Title`

- Horizontal scroll:
  - Table is wider than viewport
  - Name/email columns stay fixed on the left
  - Time slots scroll horizontally

#### 4.2 Busy / free view (toggle)

> **Note on mobile vs desktop**
> - Desktop uses tables (time-slot grid + busy/free).
> - Mobile automatically switches to an accordion/list view per employee for readability.

- Activated by clicking `Busy / free` button (JS toggles visibility)
- Table layout:
  - Sticky left columns:
    - `Sr. No`
    - `Employee Name`
    - `Email`
  - Right side:
    - `Busy events`
      - All events for that user on the selected date
      - One per line:
        - `09:30 am – 10:30 am Meeting with developers – created by ashutosh`
    - `Free slots`
      - List of slot labels where the user has **no** events
      - Based on `TIME_SLOTS` from `slot-config.xml`
      - Example:
        - `10:30 – 11:00, 11:00 – 12:00, ...`
      - If completely busy → `No free slots`

---

### 5. Detail page – month view

**Desktop** shows a full month grid (7×6). **Mobile** shows a scrollable date + events list per day so that long titles and times are fully readable.

URL: `/admin/calendar/detail?email=...`

- Month grid (7 columns by 6 weeks)
- Buttons:
  - Previous month
  - Next month
  - Month/year dropdowns
- Each day cell shows all events for that day
- Data loaded via `/admin/calendar/events-month?email=...&year=YYYY&month=M`

---

### 6. How to run locally

> **Cache busting tip:** when you change frontend JS, bump the version in `controllers/admin/calendar.js` (e.g. `/page.js?v=2`, `/detail.js?v=2`) so mobile browsers fetch the latest scripts.

1. **Install Node.js** (LTS recommended).
2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Create config files**:
   - `config/users.xml` – see examples above
   - `config/slot-config.xml` – or copy the default shown above
   - `calendaraccount.json` – Google service account key with domain-wide delegation

4. **Environment (.env or config/keys.js)**:
   - `SESSION_SECRET`
   - `ADMIN_API_URL` / `APP_API_URL` (for token validation / login API)

5. **Start the app**:

   ```bash
   npm start
   ```

6. **Open in browser**:
   - Go to `http://localhost:PORT/` (see your `app.js` / start script for port)
   - Login as the allowed admin user
   - Use `/admin/calendar/page` and `/admin/calendar/detail`

---

### 7. Maintenance tips (for “low memory” days)

- If the **list page layout** looks wrong:
  - Check `config/slot-config.xml` for valid times and slot duration
  - Verify `window.CALENDAR_TIME_SLOTS` exists in page source (view‑source)

- If a user is **missing** from both views:
  - Check `config/users.xml` for proper `<user><email>..</email><name>..</name></user>` structure

- If you get **401 / login issues**:
  - Remember: all `/admin/*` routes require login and valid tokens
  - `adminTokenCheck` will redirect to `/` (login) if session or tokens are invalid

- If **Google API** fails:
  - Confirm `calendaraccount.json` exists and has correct permissions
  - Make sure the service account is delegated to your Workspace domain

- To **change time resolution** (e.g. from 60‑minute to 30‑minute slots):
  - Only edit `slotdurationinminutes` in `config/slot-config.xml`
  - Both the grid columns and the “free slots” text will follow automatically

Keep this README open when making changes; most questions about “where is X?” or “why is Y not showing?” are answered in sections 2–4 above.

---

### 8. Mobile shortcut (Add to Home Screen)

The app exposes a basic Web App Manifest at `/manifest.webmanifest` so users can pin it to their mobile home screen.

- **Android (Chrome):**
  - Visit the app (e.g. `https://calendarevents.indiaontrack.in/admin/calendar/page`).
  - Open the browser menu → `Add to Home screen` or `Install app`.
  - A shortcut icon will appear; launching it opens the app in a standalone window.

- **iOS (Safari):**
  - Open the same URL.
  - Tap the **Share** button → `Add to Home Screen`.
  - A home-screen icon is created; tapping it opens the app like a standalone app.

You can customize the manifest (app name, icons, start URL) in `public/manifest.webmanifest`.

# Calendar Tracking – Workspace Integration & Project Guide

This document covers (1) **Google Workspace integration** using Service Account Domain-Wide Delegation, including troubleshooting when Google Cloud blocks key creation or access, and (2) **project architecture and code flow** for the Calendar Tracking application.

---

# Part 1: Workspace Integration Guide – Service Account Delegation

## 1. The Core Concept: "Domain-Wide Delegation"

A standard Service Account is like a "robot user" with its own empty space. To allow this robot to manage data belonging to **other** people (your employees), we use **Domain-Wide Delegation (DWD)**.

- **Impersonation:** Your code doesn't act as the service account; it uses the service account's "key" to act as a specific user (e.g., `sharma@indiaontrack.in`).
- **Trust:** Trust is established in the **Workspace Admin Console** using the service account’s **Unique Client ID**.

---

## 2. Setup Checklist & Troubleshooting

### Phase A: Google Cloud Infrastructure

1. **Enable APIs:** Enable the **Google Calendar API** and **Admin SDK API** in your Google Cloud project.
2. **Create Service Account:** Navigate to **IAM & Admin > Service Accounts** and create a new account (e.g. name: `calendar-tracking`). You can leave the optional role empty at creation.
3. **Service account role (Google Cloud IAM):** For Domain-Wide Delegation, the service account **does not need any project-level IAM role** in Google Cloud. Access to user calendars and the Directory is granted in the **Workspace Admin Console** (Phase B) by adding the service account’s **Client ID** and scopes there. In GCP, only ensure the **project** has the Calendar API and Admin SDK API enabled. Do **not** assign roles such as "Owner" or "Editor" to the service account; that would grant broad project access. If your org requires a minimal role for audit, you can use **Viewer** at project level, but it is not required for DWD to work.
4. **Handle Blocked Key Creation:** If you see an error stating **"Key creation is disabled by organization policy"**, follow these steps:
   - **Permission Check:** You must have the **Organization Policy Administrator** role. You often cannot grant this to yourself at the project level; you must switch to the **Organization View** (top project picker > **All** > **indiaontrack.in**) and add the role to your account under **IAM & Admin > IAM**.
   - **Disable the Policy:** Go to **IAM & Admin > Organization Policies**.
   - **The "Double Lock":** Search for and edit **both** of these policies if they exist:
     - `iam.disableServiceAccountKeyCreation`
     - `iam.managed.disableServiceAccountKeyCreation` (the newer managed version)
   - **The Fix:** Click **Edit Policy**, select **Override parent's policy**, click **Add a rule**, and set **Enforcement** to **Off**. Click **Set Policy**.
5. **Download Key:** Once the policy is **Off**, go back to your Service Account > **Keys** tab and create a **JSON Key**. Save it in the project root as `calendaraccount.json` (or the name configured in `api/v1/services/calendarService.js`).

### Phase B: Workspace Admin Console (DWD)

1. **Authorization:** Go to **Security > Access and data control > API controls > Manage Domain Wide Delegation**.
2. **Add New Client:** Paste the **Unique ID** (Client ID) from your service account and add these scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`

---

## 3. Node.js Implementation Summary

To act on behalf of a user, use the **JWT** auth method with the **subject** parameter.

```javascript
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/calendar'],
  'employee@indiaontrack.in'  // The "Subject" being impersonated
);
await auth.authorize();
const calendar = google.calendar({ version: 'v3', auth });
// Now calendar API calls run as employee@indiaontrack.in
```

In this project, **Admin SDK** (Directory API) requires impersonating an **admin user** (e.g. `admin@indiaontrack.in`). **Calendar API** calls use the **selected employee’s email** as the subject so their calendar is read.

---

## 4. Troubleshooting Table

| Error | Cause | Fix |
|-------|--------|-----|
| **"Key creation is disabled"** | Org policy enforcement | Follow Phase A, Step 3 (use Org-level roles, turn off both policies). |
| **"Edit Policy" is greyed out** | Lacking Org Policy Admin role | Switch to Organization view in picker and grant yourself the role. |
| **403: Forbidden** | Missing DWD or scopes | Ensure scopes in code match those added in Workspace Admin Domain Wide Delegation. |
| **403: Not Authorized** | Wrong impersonation | Admin SDK requires impersonating an **admin user** email (e.g. `GOOGLE_ADMIN_EMAIL`). |

---

## 5. Security Best Practices

- **Re-enable Org Policy:** Once keys are created, set the policies back to **On** to keep your organization secure.
- **Secret Management:** Never upload your `.json` key to a repository. Add `calendaraccount.json` (or `account.json`) to `.gitignore`.

**Reference:** [Fixing Service Account Key Creation Disabled](https://www.youtube.com/watch?v=ABIiOM9X5kM) – visual walkthrough for overriding the organization policy that blocks creating and downloading service account keys.

---

# Part 2: Architecture & Code Project Flow

## 6. High-Level Architecture

The application is a **single Node.js/Express app** that serves both:

- **Web UI:** HTML views (EJS), session-based login, and admin calendar page.
- **REST API:** Under `/api/v1` for auth and calendar (employees list, events by date).

The browser **never** calls the API directly. All data goes through **web routes**; the server uses a **dataservice layer** (`utils/apiService.js`) to call the API with the session token and then returns JSON to the frontend.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                 │
│  • Login page (/) → POST /login                                          │
│  • Calendar page (/admin/calendar/page)                                 │
│  • AJAX only to: /admin/calendar/employees, /admin/calendar/events      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Express App (app.js)                                                     │
│  • /api/*        → API routes (auth, calendar)                           │
│  • /             → Index routes (login view, POST /login)                 │
│  • /admin/*      → adminTokenCheck → Admin routes (calendar page, proxy)  │
└─────────────────────────────────────────────────────────────────────────┘
        │                                    │
        ▼                                    ▼
┌───────────────────────┐        ┌───────────────────────────────────────┐
│  API Layer            │        │  Web Layer                              │
│  /api/v1/auth         │        │  controllers/authentication.js         │
│  /api/v1/calendar     │        │  controllers/admin/calendar.js         │
│  → controllers        │        │  → apiService.callApiWithToken()       │
│  → services           │        │     → HTTP call to same host /api/v1/…  │
│  → Google APIs        │        │  → res.render() or res.json()           │
└───────────────────────┘        └───────────────────────────────────────┘
```

---

## 7. Directory Layout

```
calendar-tracking/
├── app.js                    # Express app: routes, session, static, middleware
├── server.js                 # HTTP server entry point
├── config/
│   └── keys.js               # Env-based config (DB, session, API URL, JWT, Google domain)
├── utils/
│   ├── apiService.js         # Dataservice: callApiWithToken(), callAdminApiLogin()
│   ├── logger.js
│   └── core.util.js          # getProtocol() for base_url
├── middleware/
│   ├── adminTokenCheck.js    # For /admin: validate/refresh tokens via API
│   └── index.js              # isLoggedIn, loginPage
├── controllers/
│   ├── authentication.js     # loginView, postLogin (calls API login, sets session)
│   └── admin/
│       └── calendar.js       # calendarPage, employeesList, eventsList (proxy to API)
├── routes/
│   ├── index.js              # GET /, POST /login, GET /logout
│   └── admin/
│       ├── index.js          # GET /admin → redirect to calendar
│       └── calendar.js       # GET /admin/calendar/page, /employees, /events
├── api/
│   ├── routes/index.js       # Mounts /api/v1
│   ├── middleware/auth.js   # Bearer or session → req.apiUser
│   ├── utils/
│   │   ├── token.util.js     # JWT generate/verify
│   │   ├── db.util.js        # (optional) not used in current auth flow
│   │   └── connection.util.js
│   └── v1/
│       ├── routes/
│       │   ├── index.js      # /auth, /calendar
│       │   ├── auth.js       # POST /login, POST /validate-tokens
│       │   └── calendar.js   # GET /employees, GET /events (auth required)
│       ├── controllers/
│       │   ├── authController.js    # login (developes@... only), validateTokens
│       │   └── calendarController.js # employeesList, eventsByDate
│       └── services/
│           └── calendarService.js   # listDomainUsers(), getCalendarEventsForDate()
├── views/
│   ├── login.ejs
│   ├── admin.ejs             # Layout: navbar, base_url, scripts
│   └── admin/calendar/
│       └── page.ejs          # Employee select, date picker, events table, prev/next
├── public/
│   └── javascripts/admin/calendar/
│       └── page.js           # Load employees, datepicker, load events, prev/next day
├── calendaraccount.json      # Service account key (do not commit)
├── .env / .env.example
└── README.md                 # This file
```

---

## 8. Request Flow (Step by Step)

### 8.1 Login

1. User opens `/` → **routes/index.js** → **controllers/authentication.loginView** → `res.render('login', { base_url, ... })`.
2. User submits login (e.g. developes@indiaontrack.in, any password) → browser POST `/login`.
3. **controllers/authentication.postLogin** runs:
   - Builds `loginData` (email, password, type, device_category, device_type).
   - Calls **apiService.callAdminApiLogin(loginData)** → HTTP POST to `ADMIN_API_URL/api/v1/auth/login`.
4. **API** **api/v1/controllers/authController.login**:
   - Accepts only `developes@indiaontrack.in` (no DB).
   - Issues JWT access_token and refresh_token, returns `{ status: true, access_token, refresh_token, data: { u_id, u_dname, u_email } }`.
5. Web controller receives response, sets **session** (auth_uid, auth_dname, auth_email, is_login, access_token, refresh_token), then sends **JSON** to browser with `Content-Type: application/json` and `{ status: true, message, data }`.
6. Browser (page.js in login.ejs) parses JSON; if `res.status` is true, redirects to **base_url + '/admin'**.

### 8.2 Accessing Admin (Calendar Page)

1. User requests `/admin` or `/admin/calendar/page`.
2. **middleware/adminTokenCheck** runs for all `/admin`:
   - Checks `req.session.is_login` and tokens.
   - Calls API **POST /api/v1/auth/validate-tokens** with access_token and refresh_token.
   - On success, updates session tokens and calls `next()`; on failure, 401 and redirect to `/`.
3. **routes/admin/calendar.js** → **controllers/admin/calendar.calendarPage**:
   - Builds view data (base_url, username, path, js, css).
   - **res.render('admin', viewData)** which includes **views/admin/calendar/page.ejs** (employee dropdown, date input, events area, prev/next buttons).

### 8.3 Loading Employees (Dropdown)

1. **public/javascripts/admin/calendar/page.js** runs on calendar page load.
2. It sends **GET /admin/calendar/employees** (session cookie sent automatically).
3. **controllers/admin/calendar.employeesList**:
   - Gets token from `req.session.access_token`.
   - Calls **apiService.callApiWithToken('/api/v1/calendar/employees', 'GET', null, token)** → server-side HTTP GET to same app’s API with `Authorization: Bearer <token>`.
4. **API** **api/v1/routes/calendar.js** (apiAuth) → **api/v1/controllers/calendarController.employeesList** → **api/v1/services/calendarService.listDomainUsers()**:
   - Uses **JWT auth with subject = GOOGLE_ADMIN_EMAIL** (admin impersonation).
   - Calls **Google Admin SDK Directory API** (domain = indiaontrack.in) and returns list of users (id, email, name).
5. API returns `{ status: 'success', data: [...] }`; web controller forwards same shape to browser; frontend fills the employee dropdown.

### 8.4 Loading Events for a Day

1. User selects an employee and a date (or changes date with prev/next).
2. **page.js** sends **GET /admin/calendar/events?email=...&date=YYYY-MM-DD**.
3. **controllers/admin/calendar.eventsList**:
   - Gets token from session, calls **apiService.callApiWithToken('/api/v1/calendar/events', 'GET', { email, date }, token)**.
4. **API** **calendarController.eventsByDate** → **calendarService.getCalendarEventsForDate(userEmail, dateStr)**:
   - Uses **JWT auth with subject = userEmail** (impersonate that employee).
   - Calls **Google Calendar API** (primary calendar, timeMin/timeMax for that day).
   - Returns events (id, summary, start, end, allDay, description, location, creator, status).
5. Web controller returns `{ status: 'success', data: events, date }`; frontend renders the table (time slot, event summary, details).

---

## 9. Summary Table

| Layer | Responsibility |
|-------|----------------|
| **Browser** | Only calls web URLs: `/login`, `/admin/calendar/page`, `/admin/calendar/employees`, `/admin/calendar/events`. Session cookie for auth. |
| **Web routes** | Map URLs to controllers; `/admin` protected by adminTokenCheck and isLoggedIn. |
| **Web controllers** | Render views or proxy to API via **apiService** (with session access_token); return HTML or JSON. |
| **apiService** | Single place for server-to-API calls: **callApiWithToken(path, method, data, token)** and **callAdminApiLogin(loginData)**. |
| **API routes** | `/api/v1/auth`, `/api/v1/calendar`; protected by **apiAuth** (Bearer or session → req.apiUser). |
| **API controllers** | Parse request, call **services**, return JSON. |
| **Calendar service** | **listDomainUsers()** (Directory API, admin subject), **getCalendarEventsForDate()** (Calendar API, employee subject). Uses **calendaraccount.json** and domain-wide delegation. |

This README is the single place for both **Google Workspace/Cloud setup and troubleshooting** and **application architecture and code flow** for the Calendar Tracking project.
