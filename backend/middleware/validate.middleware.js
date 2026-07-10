const { validationResult } = require('express-validator');
const { error } = require('../utils/response.utils');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return error(res, 'Validation failed', 400, formattedErrors);
  }
  next();
};

module.exports = { validate };
