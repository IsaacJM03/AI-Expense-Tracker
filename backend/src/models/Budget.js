const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Budget = {
  async create({ userId, categoryId, amount, period, startDate, endDate, isAdaptive, baselineAmount }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, end_date, is_adaptive, baseline_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, categoryId || null, amount, period || 'monthly',
       startDate, endDate || null, isAdaptive !== false, baselineAmount || amount]
    );
    return { id, userId, categoryId, amount, period, startDate };
  },

  async findByUser(userId) {
    return db.query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? ORDER BY b.start_date DESC`,
      [userId]
    );
  },

  async findById(id, userId) {
    const rows = await db.query(
      `SELECT b.*, c.name as category_name FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async update(id, userId, fields) {
    const allowed = ['category_id', 'amount', 'period', 'start_date', 'end_date', 'is_adaptive', 'baseline_amount'];
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
    await db.query(`UPDATE budgets SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return Budget.findById(id, userId);
  },

  async delete(id, userId) {
    const result = await db.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async getActiveForUser(userId) {
    return db.query(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND (b.end_date IS NULL OR b.end_date >= CURDATE())
       AND b.start_date <= CURDATE()`,
      [userId]
    );
  },
};

module.exports = Budget;
