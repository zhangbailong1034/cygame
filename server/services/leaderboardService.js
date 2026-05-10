const { Leaderboard, User } = require('../models');

async function getRankings() {
  const today = new Date().toISOString().slice(0, 10);

  let board = await Leaderboard.findOne({ where: { date: today } });
  if (!board) {
    const users = await User.findAll({
      order: [['total_score', 'DESC']],
      limit: 100,
    });
    const rankings = users.map((u, i) => ({
      rank: i + 1,
      nickName: u.nick_name,
      avatarUrl: u.avatar_url,
      level: u.current_level,
      totalScore: u.total_score,
      openId: u.open_id,
    }));
    board = await Leaderboard.create({ date: today, rankings });
  }
  return board.rankings;
}

module.exports = { getRankings };
