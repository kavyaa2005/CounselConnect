const feedback = require('../services/feedback.service');
const { success } = require('../utils/response.utils');

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

/** Sessions this user can still review + everything they've already said. */
const getMine = h((req, res) => success(res, {
  reviewable: feedback.getReviewable(req.user.id),
  submitted: feedback.getMyFeedback(req.user.id),
}));

const submit = h((req, res) => {
  const entry = feedback.submit(req.user.id, req.body);
  return success(res, { feedback: entry }, 'Thank you — your feedback has been shared', 201);
});

/** Public-ish: any signed-in user can see a counselor's rating summary. */
const forCounselor = h((req, res) =>
  success(res, feedback.getCounselorRating(req.params.counselorId)));

module.exports = { getMine, submit, forCounselor };
