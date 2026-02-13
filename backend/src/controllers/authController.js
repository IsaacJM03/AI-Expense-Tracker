const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { seedCategories } = require('../database/seed');
const db = require('../config/database');

async function register(req, res, next) {
  try {
    const { email, password, displayName, currency, timezone } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({ email, password, displayName, currency, timezone });

    // Seed default categories for new user
    const conn = await db.getConnection();
    try {
      await seedCategories(conn, user.id);
    } finally {
      conn.release();
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await User.comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({
      user: { id: user.id, email: user.email, displayName: user.display_name, currency: user.currency },
      token,
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await User.update(req.user.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getProfile, updateProfile };
