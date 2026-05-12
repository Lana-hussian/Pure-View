const express = require('express');
const router = express.Router();
const UserRating = require('../models/UserRating');
const Content = require('../models/Content');
const { authenticate } = require('../middleware/auth');

// GET /api/ratings/my — fetch the authenticated user's own ratings
router.get('/my', authenticate, async (req, res) => {
  try {
    const ratings = await UserRating.findAll({
      where: { user_id: req.user.user_id },
    });
    // Return as a map: { content_id: { rating_id, score } }
    const map = {};
    for (const r of ratings) {
      map[r.content_id] = { rating_id: r.rating_id, score: r.score };
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ratings/:rating_id — update an existing rating by its ID
router.put('/:rating_id', authenticate, async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined || score < 0 || score > 10) {
      return res.status(400).json({ error: 'Score must be between 0 and 10' });
    }

    const rating = await UserRating.findByPk(req.params.rating_id);
    if (!rating) return res.status(404).json({ error: 'Rating not found' });

    // Ownership check — only the user who submitted can edit
    if (rating.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'You can only edit your own ratings' });
    }

    await rating.update({ score: parseFloat(score), date: new Date() });

    // Re-compute the aggregate user_rating for the content
    const allRatings = await UserRating.findAll({ where: { content_id: rating.content_id } });
    const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;

    res.json({
      message: 'Rating updated',
      rating_id: rating.rating_id,
      new_score: score,
      new_avg: parseFloat(avg.toFixed(1)),
      rating_count: allRatings.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ratings/:rating_id — remove a user's own rating
router.delete('/:rating_id', authenticate, async (req, res) => {
  try {
    const rating = await UserRating.findByPk(req.params.rating_id);
    if (!rating) return res.status(404).json({ error: 'Rating not found' });
    if (rating.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'You can only delete your own ratings' });
    }
    await rating.destroy();
    res.json({ message: 'Rating removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
