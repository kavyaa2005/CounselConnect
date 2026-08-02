const videoService = require('../services/video.service');
const rel = require('../services/relationship.service');
const { success, error } = require('../utils/response.utils');

const h = (fn) => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};

/** Only the people this account is actually connected to. */
const getContacts = h((req, res) => {
  const contacts = videoService.getContacts(req.user);
  return success(res, {
    contacts,
    me: { id: req.user.id, role: req.user.role },
  });
});

const getHistory = h((req, res) =>
  success(res, { calls: videoService.getHistory(req.user) }));

const getStats = h((req, res) => success(res, videoService.getStats()));

/** Pre-flight check the UI uses before showing the "call" button. */
const checkPeer = h((req, res) => {
  const { id, role } = req.query;
  if (!id || !role) return error(res, 'id and role are required', 400);
  const allowed = rel.canConnect(req.user, { id, role });
  return success(res, { allowed });
});

module.exports = { getContacts, getHistory, getStats, checkPeer };
