const { User } = require('../models');

const STAMINA_MAX = 10;
const STAMINA_RECOVER_MINUTES = 5;

async function loginOrRegister(openId) {
  let user = await User.findOne({ where: { open_id: openId } });
  if (!user) {
    user = await User.create({
      open_id: openId,
      nick_name: '玩家' + openId.slice(0, 6),
      stamina: STAMINA_MAX,
    });
  }
  return user;
}

async function getUser(openId) {
  return User.findOne({ where: { open_id: openId } });
}

async function recoverStamina(user) {
  const now = new Date();
  if (!user.last_stamina_recover) {
    user.last_stamina_recover = now;
    await user.save();
    return user;
  }
  const elapsed = Math.floor((now - user.last_stamina_recover) / 60000);
  const recovered = Math.floor(elapsed / STAMINA_RECOVER_MINUTES);
  if (recovered > 0 && user.stamina < STAMINA_MAX) {
    user.stamina = Math.min(STAMINA_MAX, user.stamina + recovered);
    user.last_stamina_recover = new Date(now - (elapsed % STAMINA_RECOVER_MINUTES) * 60000);
    await user.save();
  }
  return user;
}

async function dailySign(user) {
  user.stamina = Math.min(STAMINA_MAX, user.stamina + 3);
  user.total_score += 10;
  await user.save();
  return user;
}

module.exports = { loginOrRegister, getUser, recoverStamina, dailySign };
