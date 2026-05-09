const userService = require('../services/userService');

async function login(req, res, next) {
  try {
    const { openId } = req.body;
    const user = await userService.loginOrRegister(openId);
    res.json({ token: openId, user });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    user = await userService.recoverStamina(user);
    res.json({ user });
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
    user = await userService.dailySign(user);
    res.json({ stamina: user.stamina, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { login, getMe, recoverStamina, dailySign };
