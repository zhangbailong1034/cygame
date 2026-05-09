const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HintLog = sequelize.define('HintLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.INTEGER, allowNull: false },
  row: { type: DataTypes.INTEGER, allowNull: false },
  col: { type: DataTypes.INTEGER, allowNull: false },
  hint_type: { type: DataTypes.ENUM('highlight', 'autofill'), defaultValue: 'highlight' },
}, { tableName: 'hint_logs', updatedAt: false });

module.exports = HintLog;
