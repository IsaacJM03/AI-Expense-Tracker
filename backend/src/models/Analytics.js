const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Forecast = {
  async create({ userId, forecastType, categoryId, predictedAmount, confidence, periodStart, periodEnd, modelVersion }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO forecasts (id, user_id, forecast_type, category_id, predicted_amount, confidence, period_start, period_end, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, forecastType, categoryId || null, predictedAmount, confidence || null,
       periodStart, periodEnd, modelVersion || 'v1']
    );
    return { id, userId, forecastType, predictedAmount, periodStart, periodEnd };
  },

  async findByUser(userId, { forecastType } = {}) {
    let sql = 'SELECT * FROM forecasts WHERE user_id = ?';
    const params = [userId];
    if (forecastType) {
      sql += ' AND forecast_type = ?';
      params.push(forecastType);
    }
    sql += ' ORDER BY generated_at DESC LIMIT 20';
    return db.query(sql, params);
  },

  async getLatest(userId, forecastType) {
    const rows = await db.query(
      'SELECT * FROM forecasts WHERE user_id = ? AND forecast_type = ? ORDER BY generated_at DESC LIMIT 1',
      [userId, forecastType]
    );
    return rows[0] || null;
  },
};

const Insight = {
  async create({ userId, insightType, title, description, data, priority, expiresAt }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO insights (id, user_id, insight_type, title, description, data, priority, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, insightType, title, description, JSON.stringify(data) || null,
       priority || 5, expiresAt || null]
    );
    return { id, userId, insightType, title, description };
  },

  async findByUser(userId, { unreadOnly = false, limit = 20 } = {}) {
    let sql = 'SELECT * FROM insights WHERE user_id = ?';
    if (unreadOnly) sql += ' AND is_read = FALSE';
    sql += ' ORDER BY priority ASC, created_at DESC LIMIT ?';
    return db.query(sql, [userId, String(limit)]);
  },

  async markRead(id, userId) {
    await db.query('UPDATE insights SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, userId]);
  },
};

const Recommendation = {
  async create({ userId, recommendationType, title, description, potentialSavings, actionData }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO ai_recommendations (id, user_id, recommendation_type, title, description, potential_savings, action_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, recommendationType, title, description,
       potentialSavings || null, JSON.stringify(actionData) || null]
    );
    return { id, userId, recommendationType, title, description, potentialSavings };
  },

  async findByUser(userId, { status = 'pending' } = {}) {
    let sql = 'SELECT * FROM ai_recommendations WHERE user_id = ?';
    const params = [userId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 20';
    return db.query(sql, params);
  },

  async updateStatus(id, userId, status) {
    await db.query(
      'UPDATE ai_recommendations SET status = ? WHERE id = ? AND user_id = ?',
      [status, id, userId]
    );
  },
};

module.exports = { Forecast, Insight, Recommendation };
