const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.db', // The file where the DB will be stored
  logging: false, // Disables console output of raw SQL queries
});

module.exports = sequelize;