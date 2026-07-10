const { nodeEnv } = require('../config/app.config');

const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (nodeEnv === 'development') console.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(nodeEnv === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, globalErrorHandler };
