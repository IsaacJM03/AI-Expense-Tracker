const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const Category = {
  async findByUser(userId) {
    return db.query(
      'SELECT * FROM categories WHERE user_id = ? OR is_system = TRUE ORDER BY name',
      [userId]
    );
  },

  async findById(id) {
    const rows = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ userId, name, icon, color, parentId }) {
    const id = uuidv4();
    await db.query(
      'INSERT INTO categories (id, user_id, name, icon, color, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, name, icon || null, color || null, parentId || null]
    );
    return { id, userId, name, icon, color, parentId };
  },

  async update(id, userId, fields) {
    const allowed = ['name', 'icon', 'color', 'parent_id'];
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key) && val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (updates.length === 0) return null;
    values.push(id, userId);
    await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return Category.findById(id);
  },

  async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM categories WHERE id = ? AND user_id = ? AND is_system = FALSE',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async getHierarchical(userId) {
    const all = await Category.findByUser(userId);
    const parents = all.filter(c => !c.parent_id);
    return parents.map(parent => ({
      ...parent,
      children: all.filter(c => c.parent_id === parent.id),
    }));
  },
};

module.exports = Category;
