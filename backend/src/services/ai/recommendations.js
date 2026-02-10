/**
 * AI Recommendations Service
 *
 * Generates actionable, contextual financial advice.
 *
 * Bad:  "Save more money"
 * Good: "Reducing eating out by 2 days/week saves ~18,000/month"
 * Best: "Move 15,000 to savings every Monday based on your last 3 months"
 *
 * Math finds the opportunities. LLM writes the advice (when configured).
 */

const db = require('../../config/database');
const { isLLMConfigured, callLLM } = require('./llmService');

async function generateRecommendations(userId) {
  const recommendations = [];
  const results = await Promise.allSettled([
    generateSavingsRecommendation(userId),
    generateBudgetAdjustRecommendation(userId),
    generateSpendingCutRecommendation(userId),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      if (Array.isArray(result.value)) {
        recommendations.push(...result.value);
      } else {
        recommendations.push(result.value);
      }
    }
  }

  // If LLM is configured, enhance with richer, more personal advice
  if (isLLMConfigured() && recommendations.length > 0) {
    try {
      const enhanced = await enhanceRecommendationsWithLLM(userId, recommendations);
      if (enhanced) return enhanced;
    } catch (err) {
      // Fall through to rule-based
    }
  }

  return recommendations;
}

async function generateSavingsRecommendation(userId) {
  // Analyze 3-month average income vs expenses
  const [incomeResult] = await db.query(
    `SELECT COALESCE(AVG(monthly_total), 0) as avg_income FROM (
       SELECT DATE_FORMAT(income_date, '%Y-%m') as month, SUM(amount) as monthly_total
       FROM incomes WHERE user_id = ? AND income_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       GROUP BY month
     ) t`,
    [userId]
  );

  const [expenseResult] = await db.query(
    `SELECT COALESCE(AVG(monthly_total), 0) as avg_expense FROM (
       SELECT DATE_FORMAT(expense_date, '%Y-%m') as month, SUM(amount) as monthly_total
       FROM expenses WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       GROUP BY month
     ) t`,
    [userId]
  );

  const avgIncome = parseFloat(incomeResult.avg_income);
  const avgExpense = parseFloat(expenseResult.avg_expense);

  if (avgIncome <= 0 || avgExpense <= 0) return null;

  const surplus = avgIncome - avgExpense;
  const savingsRate = (surplus / avgIncome) * 100;

  if (surplus > 0 && savingsRate < 20) {
    const targetSavings = Math.round(avgIncome * 0.2);
    const weeklyAmount = Math.round(targetSavings / 4);
    return {
      recommendationType: 'savings',
      title: 'Automate Your Savings',
      description: `Move ${weeklyAmount.toLocaleString()} to savings every Monday. Based on your last 3 months, you can save ${targetSavings.toLocaleString()}/month (20% of income).`,
      potentialSavings: targetSavings - surplus,
      actionData: { weeklyAmount, targetMonthly: targetSavings, currentSavingsRate: Math.round(savingsRate) },
    };
  }

  return null;
}

async function generateBudgetAdjustRecommendation(userId) {
  // Find categories where spending consistently exceeds budget
  const overruns = await db.query(
    `SELECT c.name, b.amount as budget, AVG(monthly_spend) as avg_spend
     FROM budgets b
     JOIN categories c ON b.category_id = c.id
     JOIN (
       SELECT category_id, DATE_FORMAT(expense_date, '%Y-%m') as month, SUM(amount) as monthly_spend
       FROM expenses WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       GROUP BY category_id, month
     ) e ON e.category_id = b.category_id
     WHERE b.user_id = ? AND b.period = 'monthly'
     GROUP BY c.name, b.amount
     HAVING avg_spend > b.amount`,
    [userId, userId]
  );

  if (overruns.length === 0) return null;

  return overruns.map(o => ({
    recommendationType: 'budget_adjust',
    title: `Adjust ${o.name} Budget`,
    description: `Your ${o.name.toLowerCase()} budget is ${Math.round(parseFloat(o.budget)).toLocaleString()} but you average ${Math.round(parseFloat(o.avg_spend)).toLocaleString()}/month. Consider adjusting to ${Math.round(parseFloat(o.avg_spend) * 1.1).toLocaleString()} or finding ways to reduce.`,
    potentialSavings: null,
    actionData: { category: o.name, currentBudget: parseFloat(o.budget), avgSpend: parseFloat(o.avg_spend) },
  }));
}

async function generateSpendingCutRecommendation(userId) {
  // Find discretionary categories with high spending
  const rows = await db.query(
    `SELECT c.name, SUM(e.amount) as total, COUNT(*) as count,
            SUM(e.amount) / COUNT(DISTINCT DATE_FORMAT(e.expense_date, '%Y-%m')) as monthly_avg
     FROM expenses e JOIN categories c ON e.category_id = c.id
     WHERE e.user_id = ? AND e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
     AND c.name IN ('Food & Dining', 'Entertainment', 'Shopping')
     GROUP BY c.name ORDER BY monthly_avg DESC LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) return null;

  const top = rows[0];
  const monthlyAvg = parseFloat(top.monthly_avg);
  const reducedAmount = Math.round(monthlyAvg * 0.2);

  if (reducedAmount < 500) return null;

  return {
    recommendationType: 'spending_cut',
    title: `Reduce ${top.name} Spending`,
    description: `Cutting ${top.name.toLowerCase()} by 20% saves ~${reducedAmount.toLocaleString()}/month. Try ${top.name === 'Food & Dining' ? 'cooking at home 2 more days/week' : 'setting a weekly limit'}.`,
    potentialSavings: reducedAmount,
    actionData: { category: top.name, currentMonthly: monthlyAvg, targetReduction: 20 },
  };
}

module.exports = { generateRecommendations };

/**
 * Takes rule-based recommendations (with actionData) and asks the LLM
 * to rewrite descriptions with richer, more personal financial advice.
 * Also fetches a financial snapshot to give the LLM more context.
 */
async function enhanceRecommendationsWithLLM(userId, ruleRecommendations) {
  // Build a lightweight financial context (no PII)
  const [incomeRow] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND income_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    [userId]
  );
  const [expenseRow] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND expense_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    [userId]
  );

  const context = {
    monthlyIncome: parseFloat(incomeRow.total),
    monthlySpendSoFar: parseFloat(expenseRow.total),
    recommendations: ruleRecommendations,
  };

  const systemPrompt = `You are a personal finance advisor. You'll receive financial data and rule-based recommendations.
Rewrite ONLY the "title" and "description" fields to be more conversational, specific, and actionable.

Rules:
- Keep recommendationType, potentialSavings, and actionData UNCHANGED
- Use exact numbers from the data — don't round or invent
- Each description should be 1-2 sentences max
- Include a concrete action step (when, how much, where)
- Be encouraging, not preachy

Return ONLY a valid JSON array with the same structure but improved title/description.`;

  const result = await callLLM(systemPrompt, JSON.stringify(context), {
    temperature: 0.4,
    maxTokens: 800,
  });

  if (!result.success) return null;

  try {
    const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const enhanced = JSON.parse(cleaned);
    return ruleRecommendations.map((original, i) => ({
      ...original,
      title: enhanced[i]?.title || original.title,
      description: enhanced[i]?.description || original.description,
      source: 'llm-enhanced',
    }));
  } catch {
    return null;
  }
}
