const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  open_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  nick_name: { type: DataTypes.STRING(32), defaultValue: '玩家' },
  avatar_url: { type: DataTypes.STRING(256), defaultValue: '' },
  current_level: { type: DataTypes.INTEGER, defaultValue: 1 },
  total_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 10 },
  last_stamina_recover: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'users' });

module.exports = User;
