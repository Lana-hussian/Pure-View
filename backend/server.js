require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const sequelize = require('./src/database/db');
const User = require('./src/models/User');
const Content = require('./src/models/Content');
const UserRating = require('./src/models/UserRating');
const FamilyClassification = require('./src/models/FamilyClassification');
const AIRatingModel = require('./src/models/AIRatingModel');

// Associations
Content.hasOne(FamilyClassification, { foreignKey: 'content_id', as: 'familyClassification' });
FamilyClassification.belongsTo(Content, { foreignKey: 'content_id' });
User.hasMany(UserRating, { foreignKey: 'user_id' });
UserRating.belongsTo(User, { foreignKey: 'user_id' });
Content.hasMany(UserRating, { foreignKey: 'content_id' });
UserRating.belongsTo(Content, { foreignKey: 'content_id' });

const authRoutes = require('./src/routes/auth');
const contentRoutes = require('./src/routes/content');
const adminRoutes = require('./src/routes/admin');
const ratingsRoutes = require('./src/routes/ratings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded posters
const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Sync DB then start
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

sequelize.sync()
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, () => console.log(`🚀 Pure View API running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌ DB sync failed:', err); process.exit(1); });
