const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Income = {
  async create({ userId, amount, sourceName, description, incomeDate, isRecurring, recurrenceInterval }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO incomes (id, user_id, amount, source_name, description, income_date, is_recurring, recurrence_interval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, amount, sourceName, description || null, incomeDate || new Date(),
       isRecurring || false, recurrenceInterval || null]
    );
    return { id, userId, amount, sourceName, incomeDate };
  },

  async findByUser(userId, { limit = 50, offset = 0 } = {}) {
    return db.query(
      'SELECT * FROM incomes WHERE user_id = ? ORDER BY income_date DESC LIMIT ? OFFSET ?',
      [userId, String(limit), String(offset)]
    );
  },

  async findById(id, userId) {
    const rows = await db.query('SELECT * FROM incomes WHERE id = ? AND user_id = ?', [id, userId]);
    return rows[0] || null;
  },

  async update(id, userId, fields) {
    const allowed = ['amount', 'source_name', 'description', 'income_date', 'is_recurring', 'recurrence_interval'];
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key) && val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (updates.length === 0) return null;
    values.push(id, userId);
    await db.query(`UPDATE incomes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return Income.findById(id, userId);
  },

  async delete(id, userId) {
    const result = await db.query('DELETE FROM incomes WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async getMonthlyTotal(userId, startDate, endDate) {
    const rows = await db.query(
      `SELECT SUM(amount) as total FROM incomes WHERE user_id = ? AND income_date >= ? AND income_date <= ?`,
      [userId, startDate, endDate]
    );
    return rows[0]?.total || 0;
  },
};

module.exports = Income;
