const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Expense = {
  async create({ userId, categoryId, amount, description, merchant, expenseDate, paymentMethod, isRecurring, confidenceScore, source }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO expenses (id, user_id, category_id, amount, description, merchant, expense_date, payment_method, is_recurring, confidence_score, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, categoryId || null, amount, description || null, merchant || null,
       expenseDate || new Date(), paymentMethod || null, isRecurring || false,
       confidenceScore || 1.0, source || 'manual']
    );
    return { id, userId, categoryId, amount, description, merchant, expenseDate, source };
  },

  async createRawInput({ expenseId, rawText, ocrRawText, ocrImageUrl, inputType, parsedData }) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO expense_raw_inputs (id, expense_id, raw_text, ocr_raw_text, ocr_image_url, input_type, parsed_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, expenseId, rawText || null, ocrRawText || null, ocrImageUrl || null, inputType, JSON.stringify(parsedData) || null]
    );
    return { id, expenseId };
  },

  async findByUser(userId, { limit = 50, offset = 0, startDate, endDate, categoryId } = {}) {
    let sql = `SELECT e.*, c.name as category_name, c.icon as category_icon
               FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
               WHERE e.user_id = ?`;
    const params = [userId];

    if (startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(endDate);
    }
    if (categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY e.expense_date DESC LIMIT ? OFFSET ?';
    params.push(String(limit), String(offset));
    return db.query(sql, params);
  },

  async findById(id, userId) {
    const rows = await db.query(
      `SELECT e.*, c.name as category_name FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = ? AND e.user_id = ?`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async update(id, userId, fields) {
    const allowed = ['category_id', 'amount', 'description', 'merchant', 'expense_date', 'payment_method', 'is_recurring'];
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
    await db.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return Expense.findById(id, userId);
  },

  async delete(id, userId) {
    const result = await db.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async getSummary(userId, startDate, endDate) {
    const rows = await db.query(
      `SELECT c.name as category, c.icon, SUM(e.amount) as total, COUNT(*) as count
       FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date <= ?
       GROUP BY e.category_id, c.name, c.icon ORDER BY total DESC`,
      [userId, startDate, endDate]
    );
    return rows;
  },

  async getMonthlyTotals(userId, months = 6) {
    const rows = await db.query(
      `SELECT DATE_FORMAT(expense_date, '%Y-%m') as month, SUM(amount) as total, COUNT(*) as count
       FROM expenses WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
       GROUP BY month ORDER BY month DESC`,
      [userId, String(months)]
    );
    return rows;
  },
};

module.exports = Expense;
