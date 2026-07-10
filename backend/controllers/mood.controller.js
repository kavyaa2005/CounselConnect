const moodService = require('../services/mood.service');
const { success } = require('../utils/response.utils');

const logMood = (req, res, next) => {
  try {
    const entry = moodService.logMood(req.user.id, req.body);
    return success(res, { entry }, 'Mood logged successfully', 201);
  } catch (err) { next(err); }
};

const getHistory = (req, res, next) => {
  try {
    const { limit } = req.query;
    const moods = moodService.getMoodHistory(req.user.id, parseInt(limit) || 30);
    return success(res, { moods });
  } catch (err) { next(err); }
};

const getStreak = (req, res, next) => {
  try {
    const streak = moodService.getStreak(req.user.id);
    return success(res, { streak });
  } catch (err) { next(err); }
};

const getStats = (req, res, next) => {
  try {
    const stats = moodService.getMoodStats(req.user.id);
    return success(res, stats);
  } catch (err) { next(err); }
};

module.exports = { logMood, getHistory, getStreak, getStats };
