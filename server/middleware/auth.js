function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'no_token', message: '请先登录' });
  }
  req.openId = token.replace('Bearer ', '');
  next();
}

module.exports = authMiddleware;
