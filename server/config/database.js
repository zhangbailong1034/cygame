const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('pygame_dev', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = sequelize;
