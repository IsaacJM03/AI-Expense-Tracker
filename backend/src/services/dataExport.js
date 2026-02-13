/**
 * Data Export Service
 *
 * Allows users to export their financial data in CSV format.
 * Users own their data — export is a fundamental right.
 */

const db = require('../config/database');

async function exportExpensesCSV(userId, { startDate, endDate } = {}) {
  let sql = `SELECT e.amount, e.description, e.merchant, e.expense_date, e.payment_method,
                    e.source, e.confidence_score, c.name as category
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

  sql += ' ORDER BY e.expense_date DESC';

  const rows = await db.query(sql, params);

  const headers = ['Date', 'Amount', 'Category', 'Description', 'Merchant', 'Payment Method', 'Source', 'Confidence'];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const values = [
      new Date(row.expense_date).toISOString().split('T')[0],
      parseFloat(row.amount).toFixed(2),
      escapeCSV(row.category || 'Uncategorized'),
      escapeCSV(row.description || ''),
      escapeCSV(row.merchant || ''),
      escapeCSV(row.payment_method || ''),
      row.source,
      parseFloat(row.confidence_score).toFixed(2),
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

async function exportIncomesCSV(userId) {
  const rows = await db.query(
    `SELECT amount, source_name, description, income_date, is_recurring, recurrence_interval
     FROM incomes WHERE user_id = ? ORDER BY income_date DESC`,
    [userId]
  );

  const headers = ['Date', 'Amount', 'Source', 'Description', 'Recurring', 'Interval'];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const values = [
      new Date(row.income_date).toISOString().split('T')[0],
      parseFloat(row.amount).toFixed(2),
      escapeCSV(row.source_name),
      escapeCSV(row.description || ''),
      row.is_recurring ? 'Yes' : 'No',
      row.recurrence_interval || '',
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

async function exportFullReport(userId) {
  const [expenses, incomes] = await Promise.all([
    exportExpensesCSV(userId),
    exportIncomesCSV(userId),
  ]);

  return {
    expenses,
    incomes,
    generatedAt: new Date().toISOString(),
  };
}

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = { exportExpensesCSV, exportIncomesCSV, exportFullReport };
