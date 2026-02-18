const app = require('./app');
const keys = require('./config/keys');

const port = keys.PORT || process.env.PORT || 3002;
app.set('port', port);

const server = require('http').createServer(app);
server.listen(port, function() {
  console.log('Calendar Tracking listening on port', port);
});
