const express = require('express');
const router = express.Router();
const UserRating = require('../models/UserRating');
const Content = require('../models/Content');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/admin/ratings - View all ratings across the platform
router.get('/ratings', authenticate, requireAdmin, async (req, res) => {
  try {
    const ratings = await UserRating.findAll({ order: [['date', 'DESC']] });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalContent = await Content.count();
    const totalRatings = await UserRating.count();
    const avgAiRating = await Content.findOne({
      attributes: [[require('sequelize').fn('AVG', require('sequelize').col('ai_rating')), 'avg']],
      raw: true,
    });
    res.json({
      total_content: totalContent,
      total_ratings: totalRatings,
      avg_ai_rating: avgAiRating?.avg ? parseFloat(parseFloat(avgAiRating.avg).toFixed(1)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
