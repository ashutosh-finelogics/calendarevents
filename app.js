require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const keys = require('./config/keys');

const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin/index');
const calendarRouter = require('./routes/admin/calendar');
const apiRoutes = require('./api/routes');
const adminTokenCheck = require('./middleware/adminTokenCheck');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: keys.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: (keys.SESSION_VALIDITY || 1440) * 60 * 1000 }
}));
app.use(flash());

app.use('/api', apiRoutes);
app.use('/', indexRouter);

app.use('/admin', adminTokenCheck);
app.use('/admin', adminRouter);
app.use('/admin/calendar', calendarRouter);

app.use(function(req, res) {
  res.status(404).send('Not Found');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Server Error');
});

module.exports = app;
