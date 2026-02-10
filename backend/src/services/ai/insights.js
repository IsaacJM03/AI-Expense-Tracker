/**
 * Insights Service
 *
 * Generates spending pattern insights such as:
 *   - "You spend 23% more on weekends"
 *   - "Your food expenses spike after salary week"
 *   - "At current pace, you'll exceed transport budget in 6 days"
 *
 * Rule-based pattern detection with LLM-ready hooks for
 * natural language generation of insight descriptions.
 */

const db = require('../../config/database');

async function generateWeekdayVsWeekendInsight(userId) {
  const rows = await db.query(
    `SELECT
       CASE WHEN DAYOFWEEK(expense_date) IN (1, 7) THEN 'weekend' ELSE 'weekday' END as day_type,
       AVG(amount) as avg_amount,
       COUNT(*) as count
     FROM expenses WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
     GROUP BY day_type`,
    [userId]
  );

  if (rows.length < 2) return null;

  const weekend = rows.find(r => r.day_type === 'weekend');
  const weekday = rows.find(r => r.day_type === 'weekday');

  if (!weekend || !weekday || parseFloat(weekday.avg_amount) === 0) return null;

  const percentDiff = ((parseFloat(weekend.avg_amount) - parseFloat(weekday.avg_amount)) / parseFloat(weekday.avg_amount)) * 100;

  if (Math.abs(percentDiff) < 10) return null;

  const direction = percentDiff > 0 ? 'more' : 'less';
  return {
    insightType: 'pattern',
    title: 'Weekend Spending Pattern',
    description: `You spend ${Math.abs(Math.round(percentDiff))}% ${direction} on weekends compared to weekdays.`,
    data: { weekendAvg: parseFloat(weekend.avg_amount), weekdayAvg: parseFloat(weekday.avg_amount), percentDiff: Math.round(percentDiff) },
    priority: 4,
  };
}

async function generateCategoryTrendInsight(userId) {
  const rows = await db.query(
    `SELECT c.name, DATE_FORMAT(e.expense_date, '%Y-%m') as month, SUM(e.amount) as total
     FROM expenses e JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ? AND e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
     GROUP BY c.name, month ORDER BY c.name, month`,
    [userId]
  );

  if (rows.length < 2) return null;

  // Group by category
  const byCategory = {};
  for (const row of rows) {
    if (!byCategory[row.name]) byCategory[row.name] = [];
    byCategory[row.name].push({ month: row.month, total: parseFloat(row.total) });
  }

  const insights = [];
  for (const [catName, months] of Object.entries(byCategory)) {
    if (months.length < 2) continue;
    const latest = months[months.length - 1].total;
    const previous = months[months.length - 2].total;
    if (previous === 0) continue;

    const change = ((latest - previous) / previous) * 100;
    if (Math.abs(change) > 20) {
      const direction = change > 0 ? 'increased' : 'decreased';
      insights.push({
        insightType: 'trend',
        title: `${catName} Trend`,
        description: `Your ${catName.toLowerCase()} spending ${direction} by ${Math.abs(Math.round(change))}% this month.`,
        data: { category: catName, change: Math.round(change), latest, previous },
        priority: change > 0 ? 3 : 6,
      });
    }
  }

  return insights.length > 0 ? insights[0] : null;
}

async function generateTopExpenseInsight(userId) {
  const rows = await db.query(
    `SELECT c.name, SUM(e.amount) as total, COUNT(*) as count
     FROM expenses e JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ? AND expense_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
     GROUP BY c.name ORDER BY total DESC LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) return null;

  const top = rows[0];
  return {
    insightType: 'pattern',
    title: 'Top Spending Category',
    description: `${top.name} is your biggest expense this month at ${Math.round(parseFloat(top.total)).toLocaleString()} (${top.count} transactions).`,
    data: { category: top.name, total: parseFloat(top.total), count: parseInt(top.count) },
    priority: 5,
  };
}

async function generateAllInsights(userId) {
  const results = await Promise.allSettled([
    generateWeekdayVsWeekendInsight(userId),
    generateCategoryTrendInsight(userId),
    generateTopExpenseInsight(userId),
  ]);

  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

module.exports = { generateAllInsights, generateWeekdayVsWeekendInsight, generateCategoryTrendInsight, generateTopExpenseInsight };
