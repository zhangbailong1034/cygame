const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('cygame_dev', 'root', 'nono.MORE', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = sequelize;
