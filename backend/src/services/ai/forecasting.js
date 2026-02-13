/**
 * Forecasting Service (Rule-based time-series)
 *
 * Uses rolling averages, trend detection, and seasonality
 * to predict future spending. Does NOT use LLMs for this.
 *
 * Capabilities:
 *   - End-of-month balance prediction
 *   - Budget overrun risk assessment
 *   - "Safe-to-spend" calculation
 *   - Expense velocity tracking
 */

const db = require('../../config/database');

async function getEndOfMonthForecast(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  // Current month spending
  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const [currentSpend] = await db.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND expense_date >= ? AND expense_date <= ?',
    [userId, startOfMonth, endOfMonth]
  );

  // Historical monthly averages (last 3 months)
  const historicalRows = await db.query(
    `SELECT DATE_FORMAT(expense_date, '%Y-%m') as month, SUM(amount) as total
     FROM expenses WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
     GROUP BY month ORDER BY month`,
    [userId]
  );

  const historicalAvg = historicalRows.length > 0
    ? historicalRows.reduce((sum, r) => sum + parseFloat(r.total), 0) / historicalRows.length
    : 0;

  // Daily velocity (current month)
  const dailyRate = dayOfMonth > 0 ? parseFloat(currentSpend.total) / dayOfMonth : 0;
  const projectedTotal = parseFloat(currentSpend.total) + (dailyRate * daysRemaining);

  // Get current month income
  const [incomeResult] = await db.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND income_date >= ? AND income_date <= ?',
    [userId, startOfMonth, endOfMonth]
  );

  const income = parseFloat(incomeResult.total);
  const projectedBalance = income - projectedTotal;

  return {
    currentSpend: parseFloat(currentSpend.total),
    dailyRate: Math.round(dailyRate * 100) / 100,
    projectedTotal: Math.round(projectedTotal * 100) / 100,
    historicalAvg: Math.round(historicalAvg * 100) / 100,
    income,
    projectedBalance: Math.round(projectedBalance * 100) / 100,
    daysRemaining,
    confidence: historicalRows.length >= 3 ? 0.8 : 0.5,
  };
}

async function getBudgetOverrunRisks(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const budgets = await db.query(
    `SELECT b.*, c.name as category_name FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.user_id = ? AND b.period = 'monthly'
     AND (b.end_date IS NULL OR b.end_date >= CURDATE())`,
    [userId]
  );

  const risks = [];

  for (const budget of budgets) {
    let spent;
    if (budget.category_id) {
      [spent] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND category_id = ? AND expense_date >= ? AND expense_date <= ?',
        [userId, budget.category_id, startOfMonth, endOfMonth]
      );
    } else {
      [spent] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND expense_date >= ? AND expense_date <= ?',
        [userId, startOfMonth, endOfMonth]
      );
    }

    const spentAmount = parseFloat(spent.total);
    const budgetAmount = parseFloat(budget.amount);
    const percentUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    const dailyRate = dayOfMonth > 0 ? spentAmount / dayOfMonth : 0;
    const projectedTotal = spentAmount + (dailyRate * daysRemaining);
    const willOverrun = projectedTotal > budgetAmount;
    const daysUntilOverrun = dailyRate > 0 ? Math.floor((budgetAmount - spentAmount) / dailyRate) : null;

    risks.push({
      budgetId: budget.id,
      categoryName: budget.category_name || 'Overall',
      budgetAmount,
      spentAmount,
      percentUsed: Math.round(percentUsed * 10) / 10,
      projectedTotal: Math.round(projectedTotal * 100) / 100,
      willOverrun,
      daysUntilOverrun,
      riskLevel: percentUsed > 90 ? 'high' : percentUsed > 70 ? 'medium' : 'low',
    });
  }

  return risks.sort((a, b) => b.percentUsed - a.percentUsed);
}

async function getSafeToSpend(userId) {
  const forecast = await getEndOfMonthForecast(userId);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  // Safe to spend = (income - current spend) / remaining days, with buffer
  const buffer = 0.9; // 10% safety margin
  const remaining = forecast.income - forecast.currentSpend;
  const safeDaily = daysRemaining > 0 ? (remaining * buffer) / daysRemaining : 0;

  return {
    totalRemaining: Math.max(0, Math.round(remaining * 100) / 100),
    safePerDay: Math.max(0, Math.round(safeDaily * 100) / 100),
    daysRemaining,
    bufferPercent: 10,
  };
}

module.exports = { getEndOfMonthForecast, getBudgetOverrunRisks, getSafeToSpend };
