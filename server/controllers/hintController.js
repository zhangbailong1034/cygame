const hintService = require('../services/hintService');
const userService = require('../services/userService');

async function useHint(req, res, next) {
  try {
    const { levelId, row, col, hintType } = req.body;
    const result = await hintService.getHint(levelId, row, col, hintType, req.openId);

    const user = await userService.getUser(req.openId);
    user.total_score = Math.max(0, user.total_score - 10);
    await user.save();

    res.json({ ...result, scoreDelta: -10, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { useHint };
