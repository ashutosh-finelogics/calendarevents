/**
 * API Service - dataservice layer for web app → API calls.
 * All admin controller → API calls use callApiWithToken with session access_token.
 */

const axios = require('axios');
const keys = require('../config/keys');
const logger = require('./logger');
const { Console } = require('winston/lib/winston/transports');

const getApiBaseUrl = () => keys.ADMIN_API_URL || keys.APP_API_URL || '';

/**
 * Call API with Bearer token (from session).
 * @param {string} path - e.g. '/api/v1/calendar/employees'
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {Object} [data] - Query (GET) or body (POST/PUT)
 * @param {string} accessToken - req.session.access_token
 */
const callApiWithToken = async (path, method = 'GET', data = null, accessToken = '') => {
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    console.log('url: ' + url);
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    };
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    if (method === 'GET' && data && typeof data === 'object' && !(data instanceof Buffer)) {
      config.params = data;
    } else if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }
    logger.info('API Service - Calling:'+ method +url);
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    logger.error('API Service Error:', error.message);
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        data: error.response.data || {},
        message: error.response.data?.message,
        error: error.response.data?.error
      };
    }
    return { success: false, message: error.message, error: error.code || 'NETWORK_ERROR' };
  }
};

/**
 * Admin API Login - returns { access_token, refresh_token, data: user } on success.
 */
const callAdminApiLogin = async (loginData) => {
  try {

    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const url = `${baseUrl}/api/v1/auth/login`;
    logger.info('Calling Admin API Login:', url);
    const response = await axios.post(url, loginData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    logger.error('Admin API Login Error:', error.message);
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        data: error.response.data || {},
        message: error.response.data?.message,
        error: error.response.data?.error
      };
    }
    return { success: false, message: error.message, error: error.error };
  }
};

module.exports = {
  callApiWithToken,
  callAdminApiLogin,
  getApiBaseUrl
};
