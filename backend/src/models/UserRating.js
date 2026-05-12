const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const UserRating = sequelize.define('UserRating', {
  rating_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  content_id: { type: DataTypes.INTEGER, allowNull: false },
  score: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0, max: 10 } },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'UserRatings', timestamps: false });

module.exports = UserRating;
