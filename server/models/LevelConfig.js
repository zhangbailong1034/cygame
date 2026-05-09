const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LevelConfig = sequelize.define('LevelConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  level_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  rows: { type: DataTypes.INTEGER, allowNull: false },
  cols: { type: DataTypes.INTEGER, allowNull: false },
  fixed_cells: { type: DataTypes.JSON, allowNull: false },
  idioms: { type: DataTypes.JSON, allowNull: false },
  fragments: { type: DataTypes.JSON, allowNull: false },
  distractors: { type: DataTypes.JSON, defaultValue: [] },
  difficulty: { type: DataTypes.ENUM('easy', 'medium', 'hard'), defaultValue: 'easy' },
  min_score: { type: DataTypes.INTEGER, defaultValue: 50 },
}, { tableName: 'level_configs', timestamps: false });

module.exports = LevelConfig;
