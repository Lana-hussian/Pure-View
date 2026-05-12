const { DataTypes } = require('sequelize');
const sequelize = require('../database/db');

const Content = sequelize.define('Content', {
  content_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  poster: { type: DataTypes.STRING, defaultValue: '' },
  type: { type: DataTypes.ENUM('Movie', 'TV Show'), defaultValue: 'Movie' },
  genre: { type: DataTypes.STRING, defaultValue: '' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  ai_rating: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'Contents', timestamps: true });

module.exports = Content;
