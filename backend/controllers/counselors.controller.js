const counselorService = require('../services/counselors.service');
const { success } = require('../utils/response.utils');

const getCounselors = (req, res, next) => {
  try {
    // `sort` was being dropped here, so every request silently fell back to
    // the default ordering regardless of what the UI asked for.
    const { search, specialty, sort } = req.query;
    const counselors = counselorService.getCounselors({ search, specialty, sort });
    return success(res, { counselors });
  } catch (err) { next(err); }
};

const getCounselor = (req, res, next) => {
  try {
    const counselor = counselorService.getCounselorById(req.params.id);
    return success(res, { counselor });
  } catch (err) { next(err); }
};

const getReviews = (req, res, next) => {
  try { return success(res, counselorService.getCounselorReviews(req.params.id)); }
  catch (err) { next(err); }
};

/** Real bookable slots, derived from the counselor's availability. */
const getSlots = (req, res, next) => {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 14));
    return success(res, { days: counselorService.getCounselorSlots(req.params.id, days) });
  } catch (err) { next(err); }
};

module.exports = { getCounselors, getCounselor, getReviews, getSlots };
