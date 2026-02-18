const connection = require('./connection.util').pool;
const logger = require('../../utils/logger');

function trimVal(val) {
  if (val == null) return val;
  if (typeof val === 'string') return val.trim();
  return val;
}

const DB = {};

DB.getDetails = (where, table) => {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM ${table} `;
    const values = [];
    where.forEach((wd, i) => {
      sql += (i === 0 ? 'WHERE ' : 'AND ') + wd.key + ' = ? ';
      values.push(wd.value);
    });
    connection.query(sql, values).then(([rows]) => {
      resolve(rows && rows[0] ? rows[0] : null);
    }).catch((err) => {
      logger.error('DB getDetails', err.message);
      reject(err);
    });
  });
};

DB.getInfo = ({ where = '' }, tableName, queryData = []) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM ${tableName} WHERE 1=1 ${where} LIMIT 1`;
    connection.query(sql, queryData).then(([rows]) => {
      resolve(rows && rows[0] ? rows[0] : null);
    }).catch((err) => {
      logger.error('DB getInfo', err.message);
      reject(err);
    });
  });
};

module.exports = { DB };
