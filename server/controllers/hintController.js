const hintService = require('../services/hintService');
const userService = require('../services/userService');

async function useHint(req, res, next) {
  try {
    const { levelId, row, col, hintType } = req.body;
    const user = await userService.getUser(req.openId);
    if (!user) return res.status(404).json({ error: 'not_found' });

    const result = await hintService.getHint(levelId, row, col, hintType, user.id);

    user.total_score = Math.max(0, user.total_score - 10);
    await user.save();

    res.json({ ...result, scoreDelta: -10, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { useHint };
