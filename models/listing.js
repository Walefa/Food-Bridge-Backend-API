const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Listing = sequelize.define('Listing', {
  // Basic fields for our MVP
  foodType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.STRING, // e.g., "5 kg", "10 boxes" (keep it simple)
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING, // e.g., "Cape Town City Centre"
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'claimed'),
    defaultValue: 'available',
  },
  // We can add more fields later, but this is enough for the demo.
});

module.exports = Listing;