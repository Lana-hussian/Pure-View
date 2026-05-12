const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/db');

class FamilyClassification extends Model {
  isChildFriendly() {
    return (
      this.horror <= 2 &&
      this.violence <= 2 &&
      this.homosexuality <= 2 &&
      this.adult_content <= 2
    );
  }
}

FamilyClassification.init({
  classification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  content_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  horror: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 10 } },
  violence: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 10 } },
  homosexuality: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 10 } },
  adult_content: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 10 } },
}, {
  sequelize,
  tableName: 'FamilyClassifications',
  timestamps: false,
});

module.exports = FamilyClassification;
