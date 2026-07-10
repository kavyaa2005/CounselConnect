const journeyService = require('../services/journey.service');
const { success } = require('../utils/response.utils');

const getTimeline = (req, res, next) => {
  try {
    const timeline = journeyService.getTimeline(req.user.id);
    return success(res, { timeline });
  } catch (err) { next(err); }
};

module.exports = { getTimeline };
