/**
 * Insights Service
 *
 * Generates spending pattern insights such as:
 *   - "You spend 23% more on weekends"
 *   - "Your food expenses spike after salary week"
 *   - "At current pace, you'll exceed transport budget in 6 days"
 *
 * Rule-based pattern detection provides the DATA.
 * LLM enhances with natural, actionable DESCRIPTIONS when configured.
 */

const db = require('../../config/database');
const { isLLMConfigured, callLLM } = require('./llmService');

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

  const ruleInsights = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  // If LLM is configured, enhance descriptions with natural language
  console.log('[insights] isLLMConfigured:', isLLMConfigured(), '| ruleInsights count:', ruleInsights.length);
  if (isLLMConfigured() && ruleInsights.length > 0) {
    try {
      console.log('[insights] Calling enhanceInsightsWithLLM...');
      const enhanced = await enhanceInsightsWithLLM(ruleInsights);
      console.log('[insights] Enhanced result:', enhanced ? 'SUCCESS' : 'NULL');
      if (enhanced) return enhanced;
    } catch (err) {
      console.error('[insights] LLM enhancement error:', err.message || err);
    }
  }

  return ruleInsights;
}

/**
 * Takes rule-based insights (with raw data) and asks the LLM
 * to rewrite the descriptions to be more actionable and personal.
 * The DATA stays math-based; only the TEXT gets enhanced.
 */
async function enhanceInsightsWithLLM(ruleInsights) {
  const systemPrompt = `You are a personal finance advisor. You will receive spending insights with raw data. 
Rewrite ONLY the "description" field for each insight to be more actionable, specific, and conversational.

Rules:
- Keep the same structure (title, insightType, data, priority stay unchanged)
- Make descriptions specific with numbers from the data
- Add a practical tip when possible
- Keep each description under 2 sentences
- Be direct, not generic

Return ONLY a valid JSON array with the same objects but improved descriptions.`;

  const result = await callLLM(systemPrompt, JSON.stringify(ruleInsights), {
    temperature: 0.5,
    maxTokens: 800,
  });

  if (!result.success) {
    console.error('LLM call failed in enhanceInsightsWithLLM:', result.error);
    return null;
  }

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const enhanced = JSON.parse(cleaned);
    // Merge: keep rule-based data, take LLM descriptions
    return ruleInsights.map((original, i) => ({
      ...original,
      description: enhanced[i]?.description || original.description,
      source: 'llm-enhanced',
    }));
  } catch {
    return null;
  }
}

module.exports = { generateAllInsights, generateWeekdayVsWeekendInsight, generateCategoryTrendInsight, generateTopExpenseInsight };
