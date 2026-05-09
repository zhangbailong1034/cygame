const gameService = require('../services/gameService');
const userService = require('../services/userService');

async function placeFragment(req, res, next) {
  try {
    const { levelId, fragmentText, positions } = req.body;
    const user = await userService.getUser(req.openId);
    if (user.stamina <= 0) {
      return res.status(400).json({ success: false, error: 'no_stamina', message: '体力不足' });
    }
    const result = await gameService.placeFragment(levelId, fragmentText, positions, req.openId);
    res.json(result);
  } catch (err) {
    if (err.status === 400) {
      const user = await userService.getUser(req.openId);
      user.stamina = Math.max(0, user.stamina - 1);
      await user.save();
      return res.status(400).json({ success: false, error: err.code, message: err.message, stamina: user.stamina });
    }
    next(err);
  }
}

async function resetLevel(req, res, next) {
  try {
    const { levelId } = req.body;
    const result = await gameService.resetLevel(levelId, req.openId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function shareReward(req, res, next) {
  try {
    const user = await userService.getUser(req.openId);
    user.stamina = Math.min(10, user.stamina + 1);
    await user.save();
    res.json({ stamina: user.stamina });
  } catch (err) { next(err); }
}

module.exports = { placeFragment, resetLevel, shareReward };
