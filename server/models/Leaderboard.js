const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Leaderboard = sequelize.define('Leaderboard', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  rankings: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'leaderboards', timestamps: false });

module.exports = Leaderboard;
