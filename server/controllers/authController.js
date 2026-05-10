const userService = require('../services/userService');

async function login(req, res, next) {
  try {
    const { openId } = req.body;
    const user = await userService.loginOrRegister(openId);
    const signStatus = userService.getSignStatus(user);
    res.json({ token: openId, user: {
      stamina: user.stamina,
      total_score: user.total_score,
      current_level: user.current_level,
      ...signStatus,
    } });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    user = await userService.recoverStamina(user);
    const signStatus = userService.getSignStatus(user);
    res.json({ user: {
      stamina: user.stamina,
      total_score: user.total_score,
      current_level: user.current_level,
      ...signStatus,
    } });
  } catch (err) { next(err); }
}

async function recoverStamina(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    user = await userService.recoverStamina(user);
    res.json({ stamina: user.stamina });
  } catch (err) { next(err); }
}

async function dailySign(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    const result = await userService.dailySign(user);
    res.json({
      stamina: result.user.stamina,
      totalScore: result.user.total_score,
      reward: result.reward,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    next(err);
  }
}

async function doubleScore(req, res, next) {
  try {
    const { scoreDelta } = req.body;
    let user = await userService.getUser(req.openId);
    user = await userService.doubleScore(user, scoreDelta);
    res.json({ totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { login, getMe, recoverStamina, dailySign, doubleScore };
