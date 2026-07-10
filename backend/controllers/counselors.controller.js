const counselorService = require('../services/counselors.service');
const { success } = require('../utils/response.utils');

const getCounselors = (req, res, next) => {
  try {
    const { search, specialty } = req.query;
    const counselors = counselorService.getCounselors({ search, specialty });
    return success(res, { counselors });
  } catch (err) { next(err); }
};

const getCounselor = (req, res, next) => {
  try {
    const counselor = counselorService.getCounselorById(req.params.id);
    return success(res, { counselor });
  } catch (err) { next(err); }
};

module.exports = { getCounselors, getCounselor };
