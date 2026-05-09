function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.code || 'internal_error',
    message: err.message || '服务器错误',
  });
}

module.exports = errorHandler;
