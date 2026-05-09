const leaderboardService = require('../services/leaderboardService');

async function getLeaderboard(req, res, next) {
  try {
    const rankings = await leaderboardService.getRankings();
    res.json({ rankings });
  } catch (err) { next(err); }
}

module.exports = { getLeaderboard };
