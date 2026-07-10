const journalService = require('../services/journal.service');
const { success } = require('../utils/response.utils');

const getEntries = (req, res, next) => {
  try {
    const entries = journalService.getEntries(req.user.id, req.query.search || '');
    return success(res, { entries });
  } catch (err) { next(err); }
};

const getEntry = (req, res, next) => {
  try {
    const entry = journalService.getEntry(req.user.id, req.params.id);
    return success(res, { entry });
  } catch (err) { next(err); }
};

const createEntry = (req, res, next) => {
  try {
    const entry = journalService.createEntry(req.user.id, req.body);
    return success(res, { entry }, 'Journal entry created', 201);
  } catch (err) { next(err); }
};

const updateEntry = (req, res, next) => {
  try {
    const entry = journalService.updateEntry(req.user.id, req.params.id, req.body);
    return success(res, { entry }, 'Journal entry updated');
  } catch (err) { next(err); }
};

const deleteEntry = (req, res, next) => {
  try {
    journalService.deleteEntry(req.user.id, req.params.id);
    return success(res, {}, 'Journal entry deleted');
  } catch (err) { next(err); }
};

module.exports = { getEntries, getEntry, createEntry, updateEntry, deleteEntry };
