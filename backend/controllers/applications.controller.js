const svc = require('../services/applications.service');
const { success, error } = require('../utils/response.utils');

/** Public: submit a counselor application with credential files. */
const submit = async (req, res, next) => {
  try {
    // multer .fields() gives an object keyed by field name — flatten it
    const files = Object.values(req.files || {}).flat();
    const application = await svc.submit(req.body, files);
    return success(
      res,
      { application },
      'Application submitted. Our team will review your credentials and email you once a decision is made.',
      201
    );
  } catch (err) { next(err); }
};

/** Public: let an applicant look up where their application stands. */
const status = (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return error(res, 'An email address is required', 400);
    const result = svc.statusFor(email);
    if (!result) return success(res, { found: false });
    return success(res, { found: true, ...result });
  } catch (err) { next(err); }
};

module.exports = { submit, status };
