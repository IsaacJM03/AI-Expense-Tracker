const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const User = {
  async create({ email, password, displayName, currency, timezone }) {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    await db.query(
      'INSERT INTO users (id, email, password_hash, display_name, currency, timezone) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, passwordHash, displayName || null, currency || 'KES', timezone || 'Africa/Nairobi']
    );
    return { id, email, displayName, currency, timezone };
  },

  async findByEmail(email) {
    const rows = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await db.query(
      'SELECT id, email, display_name, currency, timezone, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['display_name', 'currency', 'timezone'];
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key) && val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (updates.length === 0) return null;
    values.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return User.findById(id);
  },

  async comparePassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  },
};

module.exports = User;
