const mysql = require('mysql2/promise');
const config = require('./index');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

async function query(sql, params) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function getConnection() {
  const p = getPool();
  return p.getConnection();
}

module.exports = { getPool, query, getConnection };
