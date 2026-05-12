const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'pureview_secret_key_2024';
const JWT_EXPIRES = '7d';

class AuthenticationService {
  async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(plainPassword, salt);
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  generateToken(user) {
    return jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
  }

  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Invalid email or password');

    const valid = await this.verifyPassword(password, user.password);
    if (!valid) throw new Error('Invalid email or password');

    const token = this.generateToken(user);
    return {
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    };
  }

  async logout() {
    // JWT is stateless; client should discard the token.
    return { message: 'Logged out successfully' };
  }

  async register(name, email, password, role = 'Client') {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw new Error('Email already registered');

    const hashed = await this.hashPassword(password);
    const user = await User.create({ name, email, password: hashed, role });
    const token = this.generateToken(user);
    return {
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
    };
  }
}

module.exports = new AuthenticationService();
