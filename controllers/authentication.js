const { getProtocol } = require('../utils/core.util');
const logger = require('../utils/logger');
const apiService = require('../utils/apiService');

module.exports = {
  async loginView(req, res) {
    const protocol = await getProtocol(req);
    const base_url = protocol + '://' + req.get('host');
    const css = { vendor: [], plugin: [], core: [] };
    const js = { main: [], plugin: [], page: [] };
    res.render('login', {
      title: 'Calendar Tracking - Login',
      css,
      js,
      base_url,
      messages: { success: req.flash('success'), error: req.flash('error') }
    });
  },

  async postLogin(req, res) {
    try {
      const loginData = {
        email: req.body.email,
        password: req.body.password,
        type: 'Admin',
        device_category: 'Web',
        device_type: 'WEB'
      };
      const apiResponse = await apiService.callAdminApiLogin(loginData);
      if (!apiResponse.success) {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({ status: false, message: apiResponse.message || 'Login failed.' }));
        res.end();
        return;
      }
      const data = apiResponse.data;
      if (data && data.status === true) {
        const user = data.data || {};
        req.session.auth_uid = user.u_id || user.id;
        req.session.auth_dname = user.u_dname || user.email;
        req.session.auth_email = user.u_email || user.email;
        req.session.is_login = true;
        req.session.access_token = data.access_token;
        req.session.refresh_token = data.refresh_token;
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({ status: true, message: data.message || 'Login successful', data: user }));
        res.end();
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify({ status: false, message: data?.message || 'Invalid email or password.' }));
        res.end();
      }
    } catch (error) {
      logger.error('Login error', error);
      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify({ status: false, message: 'An error occurred. Please try again.' }));
      res.end();
    }
  }
};
