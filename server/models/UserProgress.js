const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.INTEGER, allowNull: false },
  grid_state: { type: DataTypes.JSON, defaultValue: null },
  used_fragments: { type: DataTypes.JSON, defaultValue: [] },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'user_progress' });

module.exports = UserProgress;
