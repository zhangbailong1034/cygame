const levelService = require('../services/levelService');
const userService = require('../services/userService');

async function getLevelList(req, res, next) {
  try {
    const levels = await levelService.getLevelList();
    res.json({ levels });
  } catch (err) { next(err); }
}

async function getLevelData(req, res, next) {
  try {
    const levelId = parseInt(req.params.levelId);
    const user = await userService.recoverStamina(
      await userService.getUser(req.openId)
    );
    const data = await levelService.getLevelData(levelId, user.id);
    res.json({ ...data, stamina: user.stamina, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { getLevelList, getLevelData };
