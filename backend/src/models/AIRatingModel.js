const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database/db');
const { spawn } = require('child_process');
const path = require('path');

class AIRatingModel extends Model {
  generateScore(contentData) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '../../ml/predict.py');
      const inputPayload = JSON.stringify({
        title:         contentData.title,
        genre:         contentData.genre         || 'Unknown',
        year:          contentData.year          || new Date().getFullYear(),
        budget:        contentData.budget        || 0,
        runtime:       contentData.runtime       || 90,
        popularity:    contentData.popularity    || 20,
        overview:      contentData.overview      || '',
        company:       contentData.company       || 'Other',
        release_month: contentData.release_month || 6,
      });

      const process = spawn('python', [scriptPath, inputPayload]);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => output += data.toString());
      process.stderr.on('data', (data) => errorOutput += data.toString());

      process.on('close', (code) => {
        if (code !== 0) {
          console.error("Python ML script failed:", errorOutput);
          return resolve(65.0); // fallback score
        }
        try {
          const result = JSON.parse(output);
          if (result.error) {
            console.error("Python ML script error:", result.error);
            return resolve(65.0);
          }
          resolve(result.score || 65.0);
        } catch (err) {
          console.error("Failed to parse ML output:", output);
          resolve(65.0);
        }
      });
    });
  }

  async analyzeContent(contentData) {
    const score = await this.generateScore(contentData);
    return {
      score: score,
      analyzed_at: new Date().toISOString(),
      model_version: this.model_version,
    };
  }
}

AIRatingModel.init({
  model_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  model_version: { type: DataTypes.STRING, allowNull: false },
  metadata: { type: DataTypes.TEXT, defaultValue: '{}' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
}, { 
  sequelize, 
  tableName: 'AIRatingModels', 
  timestamps: true 
});

module.exports = AIRatingModel;
