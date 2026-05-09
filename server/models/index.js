const sequelize = require('../config/database');
const User = require('./User');
const LevelConfig = require('./LevelConfig');
const UserProgress = require('./UserProgress');
const Leaderboard = require('./Leaderboard');
const HintLog = require('./HintLog');

User.hasMany(UserProgress, { foreignKey: 'user_id' });
UserProgress.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, LevelConfig, UserProgress, Leaderboard, HintLog };
