const getProtocol = (req) => {
  return Promise.resolve(process.env.APP_PROTOCOL || (req && req.protocol) || 'http');
};

module.exports = { getProtocol };
