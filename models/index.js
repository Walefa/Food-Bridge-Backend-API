const sequelize = require('../config/database');
const Listing = require('./listing');
const User = require('./user');

// Initialize all models
const models = {
  Listing,
  User,
};

// Create all tables in the database
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection to SQLite has been established successfully.');
    // `force: true` drops the table if it already exists. Great for development!
    await sequelize.sync({ force: true });
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = { models, initializeDatabase };