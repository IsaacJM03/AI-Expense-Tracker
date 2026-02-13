/**
 * Seasonal Spending Analysis Service
 *
 * Detects spending patterns based on time-of-year, day-of-week,
 * and recurring temporal patterns. Uses rule-based time-series
 * decomposition — NOT LLMs.
 *
 * Capabilities:
 *   - Monthly seasonality (holiday spikes, back-to-school, etc.)
 *   - Day-of-week patterns
 *   - Pay-cycle correlation
 *   - Year-over-year comparison
 */

const db = require('../../config/database');

async function getMonthlySeasonality(userId) {
  // Compute net daily totals (expenses as positive, incomes subtracted)
  const rows = await db.query(
    `SELECT MONTH(dt) as month_num,
            MONTHNAME(dt) as month_name,
            AVG(daily_total) as avg_daily,
            COUNT(DISTINCT DATE(dt)) as days_tracked
     FROM (
       SELECT DATE(expense_date) as dt, SUM(amount) as daily_total
       FROM expenses WHERE user_id = ?
       GROUP BY DATE(expense_date)
       UNION ALL
       SELECT DATE(income_date) as dt, -SUM(amount) as daily_total
       FROM incomes WHERE user_id = ?
       GROUP BY DATE(income_date)
     ) daily
     GROUP BY month_num, month_name
     ORDER BY month_num`,
    [userId, userId]
  );

  if (rows.length < 2) return null;

  const avgAll = rows.reduce((sum, r) => sum + parseFloat(r.avg_daily), 0) / rows.length;

  return rows.map(r => ({
    month: parseInt(r.month_num),
    monthName: r.month_name,
    avgDailySpend: Math.round(parseFloat(r.avg_daily) * 100) / 100,
    daysTracked: parseInt(r.days_tracked),
    vsAverage: avgAll > 0
      ? Math.round(((parseFloat(r.avg_daily) - avgAll) / avgAll) * 100)
      : 0,
  }));
}

async function getDayOfWeekPattern(userId) {
  // Use net amounts (expenses minus incomes) over the last 6 months per day of week
  const rows = await db.query(
    `SELECT DAYOFWEEK(dt) as dow,
            DAYNAME(dt) as day_name,
            AVG(daily_total) as avg_amount,
            SUM(daily_total) as total,
            COUNT(*) as count
     FROM (
       SELECT DATE(expense_date) as dt, SUM(amount) as daily_total
       FROM expenses
       WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE(expense_date)
       UNION ALL
       SELECT DATE(income_date) as dt, -SUM(amount) as daily_total
       FROM incomes
       WHERE user_id = ? AND income_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE(income_date)
     ) d
     GROUP BY dow, day_name
     ORDER BY dow`,
    [userId, userId]
  );

  if (rows.length < 2) return null;

  const avgAll = rows.reduce((sum, r) => sum + parseFloat(r.avg_amount), 0) / rows.length;

  return rows.map(r => ({
    dayOfWeek: parseInt(r.dow),
    dayName: r.day_name,
    avgAmount: Math.round(parseFloat(r.avg_amount) * 100) / 100,
    totalSpent: Math.round(parseFloat(r.total) * 100) / 100,
    transactionCount: parseInt(r.count),
    vsAverage: avgAll > 0
      ? Math.round(((parseFloat(r.avg_amount) - avgAll) / avgAll) * 100)
      : 0,
  }));
}

async function getPayCycleCorrelation(userId) {
  // Analyze if spending spikes around income dates
  const incomeRows = await db.query(
    `SELECT DAY(income_date) as pay_day, COUNT(*) as freq
     FROM incomes WHERE user_id = ? AND is_recurring = TRUE
     GROUP BY pay_day ORDER BY freq DESC LIMIT 1`,
    [userId]
  );

  if (incomeRows.length === 0) return null;

  const payDay = parseInt(incomeRows[0].pay_day);

  // Compare net amounts in the 5 days after payday vs rest of month (use expenses minus incomes)
  const rows = await db.query(
    `SELECT period, AVG(daily_total) as avg_amount, COUNT(*) as count
     FROM (
       SELECT
         CASE WHEN DAY(dt) BETWEEN ? AND ? THEN 'post_payday' ELSE 'other' END as period,
         SUM(daily_total) as daily_total
       FROM (
         SELECT DATE(expense_date) as dt, SUM(amount) as daily_total
         FROM expenses
         WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY DATE(expense_date)
         UNION ALL
         SELECT DATE(income_date) as dt, -SUM(amount) as daily_total
         FROM incomes
         WHERE user_id = ? AND income_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
         GROUP BY DATE(income_date)
       ) combined
       GROUP BY dt
     ) grouped
     GROUP BY period`,
    [payDay, Math.min(payDay + 5, 28), userId, userId]
  );

  if (rows.length < 2) return null;

  const postPayday = rows.find(r => r.period === 'post_payday');
  const other = rows.find(r => r.period === 'other');

  if (!postPayday || !other) return null;

  const postAvg = parseFloat(postPayday.avg_amount);
  const otherAvg = parseFloat(other.avg_amount);
  const spikePercent = otherAvg > 0 ? Math.round(((postAvg - otherAvg) / otherAvg) * 100) : 0;

  return {
    payDay,
    postPaydayAvg: Math.round(postAvg * 100) / 100,
    otherDaysAvg: Math.round(otherAvg * 100) / 100,
    spikePercent,
    hasSpike: spikePercent > 15,
    insight: spikePercent > 15
      ? `You spend ${spikePercent}% more in the 5 days after payday (day ${payDay}).`
      : 'Your spending is relatively consistent across the month.',
  };
}

async function getCategorySeasonality(userId) {
  const rows = await db.query(
    `SELECT c.name as category,
            MONTH(e.expense_date) as month_num,
            MONTHNAME(e.expense_date) as month_name,
            SUM(e.amount) as total,
            COUNT(*) as count
     FROM expenses e JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ?
     GROUP BY c.name, month_num, month_name
     ORDER BY c.name, month_num`,
    [userId]
  );

  if (rows.length < 3) return null;

  // Group by category and find peaks
  const byCategory = {};
  for (const row of rows) {
    if (!byCategory[row.category]) byCategory[row.category] = [];
    byCategory[row.category].push({
      month: parseInt(row.month_num),
      monthName: row.month_name,
      total: parseFloat(row.total),
      count: parseInt(row.count),
    });
  }

  const results = [];
  for (const [category, months] of Object.entries(byCategory)) {
    if (months.length < 2) continue;

    const avg = months.reduce((sum, m) => sum + m.total, 0) / months.length;
    const peak = months.reduce((max, m) => m.total > max.total ? m : max, months[0]);
    const trough = months.reduce((min, m) => m.total < min.total ? m : min, months[0]);

    if (avg > 0 && ((peak.total - avg) / avg) > 0.3) {
      results.push({
        category,
        peakMonth: peak.monthName,
        peakAmount: Math.round(peak.total * 100) / 100,
        troughMonth: trough.monthName,
        troughAmount: Math.round(trough.total * 100) / 100,
        avgMonthly: Math.round(avg * 100) / 100,
        peakVsAvg: Math.round(((peak.total - avg) / avg) * 100),
      });
    }
  }

  return results.length > 0 ? results : null;
}

async function getFullSeasonalAnalysis(userId) {
  const [monthly, dayOfWeek, payCycle, categorySeasonal] = await Promise.allSettled([
    getMonthlySeasonality(userId),
    getDayOfWeekPattern(userId),
    getPayCycleCorrelation(userId),
    getCategorySeasonality(userId),
  ]);

  return {
    monthlySeasonality: monthly.status === 'fulfilled' ? monthly.value : null,
    dayOfWeekPattern: dayOfWeek.status === 'fulfilled' ? dayOfWeek.value : null,
    payCycleCorrelation: payCycle.status === 'fulfilled' ? payCycle.value : null,
    categorySeasonality: categorySeasonal.status === 'fulfilled' ? categorySeasonal.value : null,
  };
}

module.exports = {
  getMonthlySeasonality,
  getDayOfWeekPattern,
  getPayCycleCorrelation,
  getCategorySeasonality,
  getFullSeasonalAnalysis,
};
