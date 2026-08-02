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

const getFullHistory = (req, res, next) => {
  try {
    return success(res, moodService.getFullHistory(req.user.id, {
      limit: Math.min(200, Number(req.query.limit) || 60),
      offset: Math.max(0, Number(req.query.offset) || 0),
    }));
  } catch (err) { next(err); }
};

const getReport = (req, res, next) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'week';
    return success(res, moodService.getReport(req.user.id, period));
  } catch (err) { next(err); }
};

/** The same report as a printable PDF. */
const downloadReport = (req, res, next) => {
  try {
    const { readStore } = require('../utils/fileStore.utils');
    const period = req.query.period === 'month' ? 'month' : 'week';
    const u = readStore('users.json').find(x => x.id === req.user.id);
    require('../services/pdf.service').streamMoodReport(res, {
      client: { name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Client' },
      report: moodService.getReport(req.user.id, period),
    });
  } catch (err) { next(err); }
};

module.exports = { logMood, getHistory, getStreak, getStats, getFullHistory, getReport, downloadReport };
