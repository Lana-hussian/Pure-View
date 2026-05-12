const sequelize = require('./src/database/db');
const User = require('./src/models/User');
const Content = require('./src/models/Content');
const FamilyClassification = require('./src/models/FamilyClassification');
const UserRating = require('./src/models/UserRating');
const AIRatingModel = require('./src/models/AIRatingModel');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

Content.hasOne(FamilyClassification, { foreignKey: 'content_id', as: 'familyClassification' });
FamilyClassification.belongsTo(Content, { foreignKey: 'content_id' });
User.hasMany(UserRating, { foreignKey: 'user_id' });
Content.hasMany(UserRating, { foreignKey: 'content_id' });

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const seed = async () => {
  await sequelize.sync({ force: true });
  console.log('🌱 Seeding database...');

  // Users
  const adminPass = await bcrypt.hash('admin123', 12);
  const userPass = await bcrypt.hash('user123', 12);
  await User.create({ name: 'Admin', email: 'admin@pureview.com', password: adminPass, role: 'Admin' });
  await User.create({ name: 'Alice', email: 'alice@example.com', password: userPass, role: 'Client' });
  await User.create({ name: 'Bob', email: 'bob@example.com', password: userPass, role: 'Client' });

  // AI Model
  await AIRatingModel.create({ model_version: 'v1.0', description: 'Base PureView AI scoring model', metadata: JSON.stringify({ created: '2024-01' }) });

  // Content
  const movies = [
    { title: 'The Silent Hour', year: 2023, type: 'Movie', genre: 'Thriller', description: 'A deaf detective unravels a city-wide conspiracy in 24 hours.', ai_rating: 87.4, horror: 3, violence: 6, homosexuality: 0, adult_content: 2 },
    { title: 'Neon Requiem', year: 2022, type: 'Movie', genre: 'Sci-Fi', description: 'In 2087 Tokyo, an android searches for the meaning of consciousness.', ai_rating: 92.1, horror: 1, violence: 4, homosexuality: 2, adult_content: 1 },
    { title: 'Eden Protocol', year: 2024, type: 'TV Show', genre: 'Drama', description: 'A group of survivors attempt to rebuild civilization after a climate collapse.', ai_rating: 78.5, horror: 2, violence: 5, homosexuality: 3, adult_content: 3 },
    { title: 'Crimson Hollow', year: 2023, type: 'Movie', genre: 'Horror', description: 'A family moves to a rural estate haunted by generations of dark secrets.', ai_rating: 71.3, horror: 9, violence: 7, homosexuality: 0, adult_content: 2 },
    { title: 'Little Wonders', year: 2024, type: 'TV Show', genre: 'Animation', description: 'A magical world where children learn teamwork and kindness.', ai_rating: 95.0, horror: 0, violence: 0, homosexuality: 0, adult_content: 0 },
    { title: 'Quantum Drift', year: 2021, type: 'Movie', genre: 'Sci-Fi', description: 'Two scientists discover a parallel universe with terrifying consequences.', ai_rating: 83.7, horror: 4, violence: 3, homosexuality: 1, adult_content: 2 },
    { title: 'The Last Bridge', year: 2023, type: 'Movie', genre: 'Drama', description: 'An aging architect reconciles with his estranged son on a cross-country journey.', ai_rating: 89.2, horror: 0, violence: 1, homosexuality: 4, adult_content: 1 },
    { title: 'Vortex', year: 2024, type: 'TV Show', genre: 'Action', description: 'An elite squad battles interdimensional threats to save Earth.', ai_rating: 76.8, horror: 2, violence: 8, homosexuality: 1, adult_content: 3 },
  ];

  const users = await User.findAll();
  for (const m of movies) {
    const { horror, violence, homosexuality, adult_content, ...contentData } = m;
    const content = await Content.create({ ...contentData, poster: '' });
    await FamilyClassification.create({ content_id: content.content_id, horror, violence, homosexuality, adult_content });
    // Random user ratings
    for (const u of users.filter(u => u.role === 'Client')) {
      const score = parseFloat((Math.random() * 4 + 6).toFixed(1));
      await UserRating.create({ content_id: content.content_id, user_id: u.user_id, score });
    }
  }

  console.log('✅ Database seeded!');
  console.log('👤 Admin: admin@pureview.com / admin123');
  console.log('👤 User:  alice@example.com / user123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
