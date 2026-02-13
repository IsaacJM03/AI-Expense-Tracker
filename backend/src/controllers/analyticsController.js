const { getEndOfMonthForecast, getBudgetOverrunRisks, getSafeToSpend } = require('../services/ai/forecasting');
const { generateAllInsights } = require('../services/ai/insights');
const { generateRecommendations } = require('../services/ai/recommendations');
const { Insight, Recommendation } = require('../models/Analytics');

async function getForecasts(req, res, next) {
  try {
    const [forecast, risks, safeToSpend] = await Promise.all([
      getEndOfMonthForecast(req.user.id),
      getBudgetOverrunRisks(req.user.id),
      getSafeToSpend(req.user.id),
    ]);
    res.json({ forecast, budgetRisks: risks, safeToSpend });
  } catch (err) {
    next(err);
  }
}

async function getInsights(req, res, next) {
  try {
    // Generate fresh insights
    const freshInsights = await generateAllInsights(req.user.id);

    // Also get stored insights
    const storedInsights = await Insight.findByUser(req.user.id, {
      unreadOnly: req.query.unreadOnly === 'true',
    });

    res.json({ insights: [...freshInsights, ...storedInsights] });
  } catch (err) {
    next(err);
  }
}

async function markInsightRead(req, res, next) {
  try {
    await Insight.markRead(req.params.id, req.user.id);
    res.json({ message: 'Insight marked as read' });
  } catch (err) {
    next(err);
  }
}

async function getRecommendations(req, res, next) {
  try {
    // Generate fresh recommendations
    const freshRecommendations = await generateRecommendations(req.user.id);

    // Also get stored recommendations
    const storedRecommendations = await Recommendation.findByUser(req.user.id, {
      status: req.query.status,
    });

    res.json({ recommendations: [...freshRecommendations, ...storedRecommendations] });
  } catch (err) {
    next(err);
  }
}

async function updateRecommendationStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['accepted', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "accepted" or "dismissed".' });
    }
    await Recommendation.updateStatus(req.params.id, req.user.id, status);
    res.json({ message: `Recommendation ${status}` });
  } catch (err) {
    next(err);
  }
}

module.exports = { getForecasts, getInsights, markInsightRead, getRecommendations, updateRecommendationStatus };
