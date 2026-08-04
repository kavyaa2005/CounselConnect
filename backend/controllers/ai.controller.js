const aiService = require('../services/ai.service');
const { success } = require('../utils/response.utils');

const match = (req, res, next) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      const err = new Error('answers array is required'); err.statusCode = 400; throw err;
    }
    const matches = aiService.matchCounselors(answers);
    return success(res, { matches }, 'AI matching complete');
  } catch (err) { next(err); }
};

const getRecommended = (req, res, next) => {
  try { return success(res, aiService.getRecommendedCounselors(req.user.id)); }
  catch (err) { next(err); }
};

const getInsights = (req, res, next) => {
  try {
    const insights = aiService.getMoodInsights(req.user.id);
    return success(res, { insights });
  } catch (err) { next(err); }
};

const getSummary = (req, res, next) => {
  try {
    const summary = aiService.getJourneySummary(req.user.id);
    return success(res, summary);
  } catch (err) { next(err); }
};

module.exports = { match, getInsights, getSummary, getRecommended };
