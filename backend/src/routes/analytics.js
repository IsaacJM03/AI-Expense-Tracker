const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getForecasts, getInsights, markInsightRead,
  getRecommendations, updateRecommendationStatus,
} = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate);

router.get('/forecasts', getForecasts);
router.get('/insights', getInsights);
router.patch('/insights/:id/read', markInsightRead);
router.get('/recommendations', getRecommendations);
router.patch('/recommendations/:id', updateRecommendationStatus);

module.exports = router;
