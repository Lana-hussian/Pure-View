const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Content = require('../models/Content');
const FamilyClassification = require('../models/FamilyClassification');
const UserRating = require('../models/UserRating');
const FilterService = require('../services/FilterService');
const TMDBService = require('../services/TMDBService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const sequelize = require('../database/db');

// GET /api/content/search?q= — dedicated typeahead search endpoint
router.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json([]);
    const results = await Content.findAll({
      where: { title: { [Op.like]: `%${q}%` } },
      attributes: ['content_id', 'title', 'year', 'type', 'genre', 'poster', 'ai_rating'],
      order: [['createdAt', 'DESC']],
      limit: 8,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content - Browse & filter content
router.get('/', async (req, res) => {
  try {
    const { q, horror, violence, homosexuality, adult_content, type } = req.query;

    const contentWhere = {};
    if (q) contentWhere.title = { [Op.like]: `%${q}%` };
    if (type) contentWhere.type = type;

    const hasFilter = horror !== undefined || violence !== undefined ||
      homosexuality !== undefined || adult_content !== undefined;

    const classificationWhere = {};
    if (horror !== undefined) classificationWhere.horror = { [Op.lte]: parseInt(horror) };
    if (violence !== undefined) classificationWhere.violence = { [Op.lte]: parseInt(violence) };
    if (homosexuality !== undefined) classificationWhere.homosexuality = { [Op.lte]: parseInt(homosexuality) };
    if (adult_content !== undefined) classificationWhere.adult_content = { [Op.lte]: parseInt(adult_content) };

    const contents = await Content.findAll({
      where: contentWhere,
      include: [
        {
          model: FamilyClassification,
          as: 'familyClassification',
          where: hasFilter ? classificationWhere : undefined,
          required: hasFilter,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Attach average user rating
    const contentsWithRatings = await Promise.all(contents.map(async (c) => {
      const ratings = await UserRating.findAll({ where: { content_id: c.content_id } });
      const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;
      return { ...c.toJSON(), user_rating: avg ? parseFloat(avg.toFixed(1)) : null, rating_count: ratings.length };
    }));

    res.json(contentsWithRatings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/:id
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id, {
      include: [{ model: FamilyClassification, as: 'familyClassification' }],
    });
    if (!content) return res.status(404).json({ error: 'Content not found' });

    const ratings = await UserRating.findAll({ where: { content_id: content.content_id } });
    const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : null;

    res.json({
      ...content.toJSON(),
      user_rating: avg ? parseFloat(avg.toFixed(1)) : null,
      rating_count: ratings.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const AIRatingModel = require('../models/AIRatingModel');

// POST /api/content - Admin only
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    let { title, year, poster, type, genre, description, horror, violence, homosexuality, adult_content } = req.body;

    // Step 1: enrich with TMDB metadata
    const tmdb = await TMDBService.enrich(title, year);
    if (tmdb.found) {
      genre       = genre       || tmdb.genre;      // use admin input if provided, else TMDB
      description = description || tmdb.overview;
      poster      = poster      || tmdb.poster_url; // auto-fill poster if blank
    }

    // Step 2: Generate real ML score (now enriched with budget + runtime)
    const aiInstance = AIRatingModel.build({ model_version: 'v2.0-ml' });
    const ai_rating = await aiInstance.generateScore({
      title,
      year,
      genre:         genre         || 'Unknown',
      budget:        tmdb.budget   || 0,
      runtime:       tmdb.runtime  || 90,
      popularity:    tmdb.popularity || 20,
      overview:      tmdb.overview   || '',
      company:       tmdb.company    || 'Other',
      release_month: tmdb.release_month || 6,
    });

    // Step 3: Persist
    const content = await Content.create({ title, year, poster, type, genre, description, ai_rating });
    await FamilyClassification.create({
      content_id:   content.content_id,
      horror:       horror        || 0,
      violence:     violence      || 0,
      homosexuality: homosexuality || 0,
      adult_content: adult_content || 0,
    });

    res.status(201).json({ ...content.toJSON(), tmdb_enriched: tmdb.found });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/content/:id - Admin only
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id);
    if (!content) return res.status(404).json({ error: 'Content not found' });

    const { title, year, poster, type, genre, description, ai_rating, horror, violence, homosexuality, adult_content } = req.body;
    await content.update({ title, year, poster, type, genre, description, ai_rating });

    const fc = await FamilyClassification.findOne({ where: { content_id: content.content_id } });
    if (fc) await fc.update({ horror, violence, homosexuality, adult_content });

    res.json({ message: 'Content updated', content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/content/:id - Admin only
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id);
    if (!content) return res.status(404).json({ error: 'Content not found' });
    await FamilyClassification.destroy({ where: { content_id: content.content_id } });
    await UserRating.destroy({ where: { content_id: content.content_id } });
    await content.destroy();
    res.json({ message: 'Content deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content/:id/rate - Authenticated users
router.post('/:id/rate', authenticate, async (req, res) => {
  try {
    const { score } = req.body;
    if (score < 0 || score > 10) return res.status(400).json({ error: 'Score must be 0-10' });

    const existing = await UserRating.findOne({
      where: { content_id: req.params.id, user_id: req.user.user_id },
    });
    if (existing) {
      await existing.update({ score, date: new Date() });
      return res.json({ message: 'Rating updated' });
    }

    await UserRating.create({ content_id: req.params.id, user_id: req.user.user_id, score });
    res.status(201).json({ message: 'Rating submitted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/content/:id/ratings - Admin: view all ratings
router.get('/:id/ratings', authenticate, requireAdmin, async (req, res) => {
  try {
    const ratings = await UserRating.findAll({ where: { content_id: req.params.id } });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
