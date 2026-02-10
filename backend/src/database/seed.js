const { v4: uuidv4 } = require('uuid');

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', children: ['Eating Out', 'Groceries', 'Coffee', 'Snacks'] },
  { name: 'Transport', icon: '🚕', color: '#4ECDC4', children: ['Taxi/Ride', 'Fuel', 'Public Transit', 'Parking'] },
  { name: 'Housing', icon: '🏠', color: '#45B7D1', children: ['Rent', 'Utilities', 'Maintenance', 'Internet'] },
  { name: 'Shopping', icon: '🛍️', color: '#96CEB4', children: ['Clothing', 'Electronics', 'Home Goods'] },
  { name: 'Entertainment', icon: '🎬', color: '#FFEAA7', children: ['Movies', 'Games', 'Events', 'Subscriptions'] },
  { name: 'Health', icon: '💊', color: '#DDA0DD', children: ['Medical', 'Pharmacy', 'Gym', 'Insurance'] },
  { name: 'Education', icon: '📚', color: '#98D8C8', children: ['Courses', 'Books', 'Supplies'] },
  { name: 'Personal', icon: '👤', color: '#F7DC6F', children: ['Haircut', 'Gifts', 'Charity'] },
  { name: 'Savings', icon: '💰', color: '#82E0AA', children: ['Emergency Fund', 'Investments', 'Goals'] },
  { name: 'Other', icon: '📦', color: '#AEB6BF', children: [] },
];

async function seedCategories(connection, userId) {
  for (const cat of DEFAULT_CATEGORIES) {
    const parentId = uuidv4();
    await connection.execute(
      'INSERT IGNORE INTO categories (id, user_id, name, icon, color, parent_id, is_system) VALUES (?, ?, ?, ?, ?, NULL, TRUE)',
      [parentId, userId, cat.name, cat.icon, cat.color]
    );
    for (const childName of cat.children) {
      await connection.execute(
        'INSERT IGNORE INTO categories (id, user_id, name, icon, color, parent_id, is_system) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [uuidv4(), userId, childName, cat.icon, cat.color, parentId]
      );
    }
  }
  console.log('Default categories seeded.');
}

module.exports = { seedCategories, DEFAULT_CATEGORIES };

if (require.main === module) {
  console.log('Run seed via: npm run seed -- <userId>');
  console.log('Or seed is auto-run on user registration.');
}
