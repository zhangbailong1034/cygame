const { User } = require('../models');

const STAMINA_MAX = 10;
const STAMINA_RECOVER_MINUTES = 5;

const SIGN_REWARDS = [
  { stamina: 1, score: 0,  hintCards: 0 },
  { stamina: 1, score: 0,  hintCards: 0 },
  { stamina: 1, score: 5,  hintCards: 0 },
  { stamina: 1, score: 0,  hintCards: 0 },
  { stamina: 1, score: 0,  hintCards: 1 },
  { stamina: 2, score: 0,  hintCards: 0 },
  { stamina: 3, score: 20, hintCards: 1 },
];

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
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (user.last_sign_date === today) {
    throw Object.assign(new Error('今日已签到'), { status: 400, code: 'already_signed' });
  }

  if (user.last_sign_date === yesterday) {
    user.sign_streak = (user.sign_streak % 7) + 1;
  } else {
    user.sign_streak = 1;
  }

  const reward = SIGN_REWARDS[user.sign_streak - 1];
  user.stamina = Math.min(STAMINA_MAX, user.stamina + reward.stamina);
  user.total_score += reward.score;
  user.last_sign_date = today;
  await user.save();

  return {
    user,
    reward: { ...reward, streak: user.sign_streak },
  };
}

function getSignStatus(user) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    todaySigned: user.last_sign_date === today,
    signStreak: user.sign_streak,
  };
}

async function doubleScore(user, scoreDelta) {
  user.total_score += scoreDelta;
  await user.save();
  return user;
}

module.exports = { loginOrRegister, getUser, recoverStamina, dailySign, getSignStatus, doubleScore };
