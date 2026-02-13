/**
 * Comprehensive Dummy Data Seed Script
 * 
 * Seeds a full test user with data covering EVERY feature:
 * - User account
 * - Categories (system defaults + custom)
 * - Expenses (various sources: manual, quick_entry, ocr, voice)
 * - Expense raw inputs (text, OCR receipts)
 * - Incomes (one-time + recurring)
 * - Budgets (adaptive + static, various periods)
 * - Forecasts (balance, category, overrun, safe-to-spend)
 * - Insights (pattern, anomaly, trend, milestone)
 * - AI Recommendations (savings, budget_adjust, spending_cut, etc.)
 *
 * Usage: node src/database/seedDummy.js
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { seedCategories } = require('./seed');

// ─── Test Users ──────────────────────────────────────────────
const TEST_USER = {
  id: uuidv4(),
  email: 'demo@expensetracker.com',
  password: 'Demo1234!',
  displayName: 'Demo User',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
};

const TEST_USER_2 = {
  id: uuidv4(),
  email: 'test@expensetracker.com',
  password: 'Test1234!',
  displayName: 'Test User',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
};

// ─── Helpers ─────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function futureDate(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(monthsAgo = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, 1);
  return d.toISOString().slice(0, 10);
}

function monthEnd(monthsAgo = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo + 1, 0);
  return d.toISOString().slice(0, 10);
}

// ─── Main Seed Function ─────────────────────────────────────
async function seedDummyData() {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    console.log('🌱 Starting comprehensive dummy data seed...\n');

    // 0. Clean up existing demo users (CASCADE deletes their data)
    console.log('🧹 Cleaning up existing demo data...');
    await conn.execute('DELETE FROM users WHERE email = ?', [TEST_USER.email]);
    await conn.execute('DELETE FROM users WHERE email = ?', [TEST_USER_2.email]);
    console.log('   ✅ Old demo data cleared');

    // 1. Create demo user
    console.log('👤 Creating demo user...');
    const passwordHash = await bcrypt.hash(TEST_USER.password, 12);
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, display_name, currency, timezone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [TEST_USER.id, TEST_USER.email, passwordHash, TEST_USER.displayName, TEST_USER.currency, TEST_USER.timezone]
    );
    console.log(`   ✅ User: ${TEST_USER.email} / ${TEST_USER.password}`);

    // 2. Seed default categories
    console.log('\n📂 Seeding categories...');
    await seedCategories(conn, TEST_USER.id);

    // Fetch category IDs for linking
    const [categories] = await conn.execute(
      'SELECT id, name, parent_id FROM categories WHERE user_id = ?',
      [TEST_USER.id]
    );
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c.id; });

    // Add a custom category
    const customCatId = uuidv4();
    await conn.execute(
      'INSERT INTO categories (id, user_id, name, icon, color, parent_id, is_system) VALUES (?, ?, ?, ?, ?, NULL, FALSE)',
      [customCatId, TEST_USER.id, 'Side Hustle', '💼', '#E74C3C']
    );
    catMap['Side Hustle'] = customCatId;
    console.log('   ✅ System + custom categories seeded');

    // 3. Seed expenses (spread over last 90 days, various sources)
    console.log('\n💸 Seeding expenses...');
    const expenses = [
      // Manual entries
      { amount: 2500, desc: 'Weekly groceries at Naivas', merchant: 'Naivas Supermarket', cat: 'Groceries', days: 2, source: 'manual', method: 'mpesa' },
      { amount: 350, desc: 'Morning coffee', merchant: 'Java House', cat: 'Coffee', days: 1, source: 'manual', method: 'cash' },
      { amount: 1200, desc: 'Uber to work', merchant: 'Uber', cat: 'Taxi/Ride', days: 1, source: 'manual', method: 'mpesa' },
      { amount: 15000, desc: 'Monthly rent', merchant: null, cat: 'Rent', days: 3, source: 'manual', method: 'bank_transfer', recurring: true },
      { amount: 3500, desc: 'Electric bill', merchant: 'KPLC', cat: 'Utilities', days: 5, source: 'manual', method: 'mpesa' },
      { amount: 2000, desc: 'Internet bill', merchant: 'Safaricom', cat: 'Internet', days: 5, source: 'manual', method: 'mpesa', recurring: true },
      { amount: 800, desc: 'Haircut', merchant: 'Local Barber', cat: 'Haircut', days: 7, source: 'manual', method: 'cash' },
      { amount: 5000, desc: 'New sneakers', merchant: 'Nike Store', cat: 'Clothing', days: 10, source: 'manual', method: 'card' },
      { amount: 1500, desc: 'Movie night', merchant: 'IMAX Cinema', cat: 'Movies', days: 4, source: 'manual', method: 'mpesa' },
      { amount: 450, desc: 'Pharmacy - painkillers', merchant: 'Goodlife Pharmacy', cat: 'Pharmacy', days: 6, source: 'manual', method: 'cash' },

      // Quick entry (AI-parsed text)
      { amount: 2000, desc: 'lunch at artcaffe', merchant: 'Artcaffe', cat: 'Eating Out', days: 1, source: 'quick_entry', method: null, rawText: '2000 lunch at artcaffe' },
      { amount: 5000, desc: 'uber to airport', merchant: 'Uber', cat: 'Taxi/Ride', days: 8, source: 'quick_entry', method: null, rawText: '5k uber to airport', confidence: 0.92 },
      { amount: 300, desc: 'snack', merchant: null, cat: 'Snacks', days: 2, source: 'quick_entry', method: null, rawText: '🍿 300', confidence: 0.85 },
      { amount: 1000, desc: 'parking at mall', merchant: null, cat: 'Parking', days: 3, source: 'quick_entry', method: null, rawText: '1000 parking', confidence: 0.88 },
      { amount: 8000, desc: 'bought headphones', merchant: null, cat: 'Electronics', days: 12, source: 'quick_entry', method: null, rawText: '8k headphones', confidence: 0.90 },
      { amount: 600, desc: 'matatu fare', merchant: null, cat: 'Public Transit', days: 0, source: 'quick_entry', method: null, rawText: '🚌 600', confidence: 0.95 },

      // OCR entries (receipt scanning)
      { amount: 3200, desc: 'Restaurant meal', merchant: 'Java House Karen', cat: 'Eating Out', days: 14, source: 'ocr', method: null, ocrText: 'Java House Karen\n2026-01-27\nCappuccino 450\nClub Sandwich 850\nSteak 1500\nDessert 400\nTotal: 3200', confidence: 0.95 },
      { amount: 6500, desc: 'Grocery run', merchant: 'Carrefour', cat: 'Groceries', days: 9, source: 'ocr', method: null, ocrText: 'Carrefour Westgate\n2026-02-01\nMilk 180\nBread 120\nChicken 850\nRice 350\nVegetables 500\nFruits 400\nCooking Oil 600\nWater 200\nSnacks 800\nCleaning 500\nToiletries 1000\nOther 1000\nTotal: 6500', confidence: 0.88 },
      { amount: 1200, desc: 'Fuel', merchant: 'Shell', cat: 'Fuel', days: 11, source: 'ocr', method: null, ocrText: 'Shell Petrol Station\nLang\'ata Rd\nFuel - Petrol\n10 Litres\nTotal: KES 1,200', confidence: 0.97 },

      // Older expenses for trends/seasonal analysis (30-90 days ago)
      { amount: 2800, desc: 'Groceries', merchant: 'Naivas', cat: 'Groceries', days: 16, source: 'manual', method: 'mpesa' },
      { amount: 3200, desc: 'Groceries', merchant: 'Naivas', cat: 'Groceries', days: 23, source: 'manual', method: 'mpesa' },
      { amount: 2600, desc: 'Groceries', merchant: 'Carrefour', cat: 'Groceries', days: 30, source: 'manual', method: 'mpesa' },
      { amount: 3000, desc: 'Groceries', merchant: 'Naivas', cat: 'Groceries', days: 37, source: 'manual', method: 'mpesa' },
      { amount: 2900, desc: 'Groceries', merchant: 'Naivas', cat: 'Groceries', days: 44, source: 'manual', method: 'mpesa' },
      { amount: 3100, desc: 'Groceries', merchant: 'Carrefour', cat: 'Groceries', days: 51, source: 'manual', method: 'mpesa' },
      { amount: 2700, desc: 'Groceries', merchant: 'Naivas', cat: 'Groceries', days: 58, source: 'manual', method: 'mpesa' },
      { amount: 1500, desc: 'Uber rides', merchant: 'Uber', cat: 'Taxi/Ride', days: 20, source: 'manual', method: 'mpesa' },
      { amount: 1800, desc: 'Uber rides', merchant: 'Uber', cat: 'Taxi/Ride', days: 27, source: 'manual', method: 'mpesa' },
      { amount: 1300, desc: 'Uber to town', merchant: 'Uber', cat: 'Taxi/Ride', days: 34, source: 'manual', method: 'mpesa' },
      { amount: 1600, desc: 'Bolt ride', merchant: 'Bolt', cat: 'Taxi/Ride', days: 41, source: 'manual', method: 'mpesa' },
      { amount: 400, desc: 'Coffee', merchant: 'Java House', cat: 'Coffee', days: 15, source: 'quick_entry', method: null, rawText: '☕ 400' },
      { amount: 350, desc: 'Coffee', merchant: 'Java House', cat: 'Coffee', days: 22, source: 'quick_entry', method: null, rawText: '350 coffee' },
      { amount: 380, desc: 'Coffee', merchant: 'Artcaffe', cat: 'Coffee', days: 29, source: 'quick_entry', method: null, rawText: '380 artcaffe' },
      { amount: 15000, desc: 'Monthly rent', merchant: null, cat: 'Rent', days: 33, source: 'manual', method: 'bank_transfer', recurring: true },
      { amount: 15000, desc: 'Monthly rent', merchant: null, cat: 'Rent', days: 63, source: 'manual', method: 'bank_transfer', recurring: true },
      { amount: 2500, desc: 'Netflix + Spotify + YouTube Premium', merchant: null, cat: 'Subscriptions', days: 18, source: 'manual', method: 'card', recurring: true },
      { amount: 4000, desc: 'Gym membership', merchant: 'FitLife Gym', cat: 'Gym', days: 20, source: 'manual', method: 'mpesa', recurring: true },
      { amount: 1200, desc: 'Udemy course', merchant: 'Udemy', cat: 'Courses', days: 25, source: 'manual', method: 'card' },
      { amount: 3000, desc: 'Birthday gift', merchant: null, cat: 'Gifts', days: 35, source: 'manual', method: 'mpesa' },
      { amount: 2000, desc: 'Weekend eating out', merchant: 'KFC', cat: 'Eating Out', days: 13, source: 'manual', method: 'mpesa' },
      { amount: 1800, desc: 'Friday dinner', merchant: 'About Thyme', cat: 'Eating Out', days: 6, source: 'manual', method: 'card' },
      { amount: 2200, desc: 'Sunday brunch', merchant: 'Artcaffe', cat: 'Eating Out', days: 20, source: 'manual', method: 'mpesa' },
      { amount: 500, desc: 'Charity donation', merchant: null, cat: 'Charity', days: 40, source: 'manual', method: 'mpesa' },
      // Anomaly: unusually large expense
      { amount: 25000, desc: 'Emergency car repair', merchant: 'AutoXpress', cat: 'Other', days: 45, source: 'manual', method: 'mpesa' },
      // Weekend spending cluster
      { amount: 3500, desc: 'Saturday night out', merchant: null, cat: 'Entertainment', days: 6, source: 'manual', method: 'cash' },
      { amount: 4500, desc: 'Weekend trip', merchant: null, cat: 'Entertainment', days: 13, source: 'manual', method: 'mpesa' },
    ];

    let expenseCount = 0;
    for (const exp of expenses) {
      const expId = uuidv4();
      const catId = catMap[exp.cat] || catMap['Other'] || null;

      await conn.execute(
        `INSERT INTO expenses (id, user_id, category_id, amount, description, merchant, expense_date, payment_method, is_recurring, confidence_score, source) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expId, TEST_USER.id, catId, exp.amount, exp.desc, exp.merchant || null,
          daysAgo(exp.days), exp.method || null, exp.recurring || false,
          exp.confidence || 1.00, exp.source
        ]
      );

      // Create raw input records for quick_entry and OCR
      if (exp.source === 'quick_entry' && exp.rawText) {
        await conn.execute(
          `INSERT INTO expense_raw_inputs (id, expense_id, raw_text, input_type, parsed_data) VALUES (?, ?, ?, 'text', ?)`,
          [uuidv4(), expId, exp.rawText, JSON.stringify({ amount: exp.amount, category: exp.cat, confidence: exp.confidence || 0.85 })]
        );
      } else if (exp.source === 'ocr' && exp.ocrText) {
        await conn.execute(
          `INSERT INTO expense_raw_inputs (id, expense_id, ocr_raw_text, input_type, parsed_data) VALUES (?, ?, ?, 'ocr', ?)`,
          [uuidv4(), expId, exp.ocrText, JSON.stringify({ merchant: exp.merchant, total: exp.amount, confidence: exp.confidence || 0.90 })]
        );
      }

      expenseCount++;
    }
    console.log(`   ✅ ${expenseCount} expenses seeded (manual, quick_entry, OCR)`);

    // 4. Seed incomes
    console.log('\n💰 Seeding incomes...');
    const incomes = [
      { amount: 120000, source: 'Software Developer Salary', desc: 'Monthly salary', days: 2, recurring: true, interval: 'monthly' },
      { amount: 120000, source: 'Software Developer Salary', desc: 'Monthly salary', days: 32, recurring: true, interval: 'monthly' },
      { amount: 120000, source: 'Software Developer Salary', desc: 'Monthly salary', days: 62, recurring: true, interval: 'monthly' },
      { amount: 15000, source: 'Freelance Web Dev', desc: 'Website project for client', days: 15, recurring: false, interval: null },
      { amount: 8000, source: 'Side Hustle', desc: 'Tutoring sessions', days: 25, recurring: true, interval: 'biweekly' },
      { amount: 5000, source: 'Dividends', desc: 'Stock dividends Q1', days: 45, recurring: true, interval: 'quarterly' },
    ];

    for (const inc of incomes) {
      await conn.execute(
        `INSERT INTO incomes (id, user_id, amount, source_name, description, income_date, is_recurring, recurrence_interval) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), TEST_USER.id, inc.amount, inc.source, inc.desc, daysAgo(inc.days), inc.recurring, inc.interval]
      );
    }
    console.log(`   ✅ ${incomes.length} incomes seeded (salary, freelance, side hustle, dividends)`);

    // 5. Seed budgets
    console.log('\n📊 Seeding budgets...');
    const budgets = [
      { cat: 'Food & Dining', amount: 15000, period: 'monthly', adaptive: true, baseline: 12000 },
      { cat: 'Transport', amount: 8000, period: 'monthly', adaptive: true, baseline: 6000 },
      { cat: 'Entertainment', amount: 5000, period: 'monthly', adaptive: false, baseline: null },
      { cat: 'Shopping', amount: 10000, period: 'monthly', adaptive: true, baseline: 8000 },
      { cat: 'Health', amount: 6000, period: 'monthly', adaptive: false, baseline: null },
      { cat: 'Housing', amount: 22000, period: 'monthly', adaptive: false, baseline: null },
      { cat: 'Savings', amount: 20000, period: 'monthly', adaptive: true, baseline: 15000 },
      { cat: 'Education', amount: 5000, period: 'quarterly', adaptive: false, baseline: null },
      { cat: 'Personal', amount: 3000, period: 'weekly', adaptive: false, baseline: null },
    ];

    for (const b of budgets) {
      const catId = catMap[b.cat] || null;
      await conn.execute(
        `INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, end_date, is_adaptive, baseline_amount) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), TEST_USER.id, catId, b.amount, b.period, monthStart(0), monthEnd(0), b.adaptive, b.baseline]
      );
    }
    console.log(`   ✅ ${budgets.length} budgets seeded (adaptive + static, weekly/monthly/quarterly)`);

    // ─── SECOND USER ─────────────────────────────────────────────
    console.log('\n\n👤 Creating second demo user...');
    const passwordHash2 = await bcrypt.hash(TEST_USER_2.password, 12);
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, display_name, currency, timezone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [TEST_USER_2.id, TEST_USER_2.email, passwordHash2, TEST_USER_2.displayName, TEST_USER_2.currency, TEST_USER_2.timezone]
    );
    console.log(`   ✅ User: ${TEST_USER_2.email} / ${TEST_USER_2.password}`);

    // Seed categories for user 2
    await seedCategories(conn, TEST_USER_2.id);
    const [categories2] = await conn.execute(
      'SELECT id, name, parent_id FROM categories WHERE user_id = ?',
      [TEST_USER_2.id]
    );
    const catMap2 = {};
    categories2.forEach(c => { catMap2[c.name] = c.id; });

    // A smaller set of expenses for user 2
    console.log('\n💸 Seeding expenses for Test User...');
    const expenses2 = [
      { amount: 1800, desc: 'Lunch at KFC', merchant: 'KFC', cat: 'Eating Out', days: 1, source: 'manual', method: 'mpesa' },
      { amount: 4200, desc: 'Groceries', merchant: 'Quickmart', cat: 'Groceries', days: 3, source: 'manual', method: 'mpesa' },
      { amount: 900, desc: 'Bus fare', merchant: null, cat: 'Public Transit', days: 0, source: 'quick_entry', method: null, rawText: '🚌 900', confidence: 0.90 },
      { amount: 12000, desc: 'Rent', merchant: null, cat: 'Rent', days: 5, source: 'manual', method: 'bank_transfer', recurring: true },
      { amount: 2800, desc: 'Electric + water', merchant: 'KPLC', cat: 'Utilities', days: 7, source: 'manual', method: 'mpesa' },
      { amount: 500, desc: 'Coffee and cake', merchant: 'Artcaffe', cat: 'Coffee', days: 2, source: 'quick_entry', method: null, rawText: '500 coffee artcaffe', confidence: 0.88 },
      { amount: 3500, desc: 'Weekend outing', merchant: null, cat: 'Entertainment', days: 6, source: 'manual', method: 'cash' },
      { amount: 1500, desc: 'Bolt to town', merchant: 'Bolt', cat: 'Taxi/Ride', days: 4, source: 'quick_entry', method: null, rawText: '1.5k bolt', confidence: 0.92 },
      { amount: 6000, desc: 'New jacket', merchant: 'Zara', cat: 'Clothing', days: 10, source: 'manual', method: 'card' },
      { amount: 750, desc: 'Paracetamol + vitamins', merchant: 'Goodlife Pharmacy', cat: 'Pharmacy', days: 8, source: 'manual', method: 'cash' },
    ];

    for (const exp of expenses2) {
      const expId = uuidv4();
      const catId = catMap2[exp.cat] || catMap2['Other'] || null;
      await conn.execute(
        `INSERT INTO expenses (id, user_id, category_id, amount, description, merchant, expense_date, payment_method, is_recurring, confidence_score, source) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [expId, TEST_USER_2.id, catId, exp.amount, exp.desc, exp.merchant || null, daysAgo(exp.days), exp.method || null, exp.recurring || false, exp.confidence || 1.00, exp.source]
      );
      if (exp.source === 'quick_entry' && exp.rawText) {
        await conn.execute(
          `INSERT INTO expense_raw_inputs (id, expense_id, raw_text, input_type, parsed_data) VALUES (?, ?, ?, 'text', ?)`,
          [uuidv4(), expId, exp.rawText, JSON.stringify({ amount: exp.amount, category: exp.cat, confidence: exp.confidence || 0.85 })]
        );
      }
    }
    console.log(`   ✅ ${expenses2.length} expenses seeded for Test User`);

    // Income for user 2
    await conn.execute(
      `INSERT INTO incomes (id, user_id, amount, source_name, description, income_date, is_recurring, recurrence_interval) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), TEST_USER_2.id, 85000, 'Salary', 'Monthly salary', daysAgo(3), true, 'monthly']
    );
    console.log('   ✅ 1 income seeded for Test User');

    // Budget for user 2
    const budgets2 = [
      { cat: 'Food & Dining', amount: 12000, period: 'monthly' },
      { cat: 'Transport', amount: 5000, period: 'monthly' },
      { cat: 'Housing', amount: 16000, period: 'monthly' },
    ];
    for (const b of budgets2) {
      await conn.execute(
        `INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, end_date, is_adaptive, baseline_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), TEST_USER_2.id, catMap2[b.cat] || null, b.amount, b.period, monthStart(0), monthEnd(0), false, null]
      );
    }
    console.log(`   ✅ ${budgets2.length} budgets seeded for Test User`);

    // ─── Summary ───────────────────────────────────────────────
    console.log('\n' + '═'.repeat(55));
    console.log('  🎉 DUMMY DATA SEED COMPLETE');
    console.log('═'.repeat(55));
    console.log(`\n  Login credentials:`);
    console.log(`    📧 Demo:  ${TEST_USER.email} / ${TEST_USER.password}`);
    console.log(`    📧 Test:  ${TEST_USER_2.email} / ${TEST_USER_2.password}`);
    console.log(`\n  Demo User data:`);
    console.log(`    📂 ${categories.length + 1} categories (system + custom)`);
    console.log(`    💸 ${expenseCount} expenses (manual, quick_entry, OCR)`);
    console.log(`    💰 ${incomes.length} incomes (salary, freelance, dividends)`);
    console.log(`    📊 ${budgets.length} budgets (adaptive + static)`);
    console.log(`\n  Test User data:`);
    console.log(`    📂 ${categories2.length} categories (system defaults)`);
    console.log(`    💸 ${expenses2.length} expenses (manual, quick_entry)`);
    console.log(`    💰 1 income (salary)`);
    console.log(`    📊 ${budgets2.length} budgets`);
    console.log(`\n  AI data NOT seeded (test it live!):`);
    console.log(`    🔮 Forecasts   → GET /api/analytics/forecasts`);
    console.log(`    💡 Insights    → GET /api/analytics/insights`);
    console.log(`    🤖 Recommendations → GET /api/analytics/recommendations`);
    console.log(`    🧠 AI Parse    → POST /api/v1/ai/parse`);
    console.log(`    🏷️  AI Category → POST /api/v1/ai/categorize`);
    console.log(`    📸 OCR Parse   → POST /api/v1/ocr/receipt`);
    console.log('');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    conn.release();
  }
}

// CLI runner
if (require.main === module) {
  (async () => {
    try {
      await seedDummyData();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}

module.exports = { seedDummyData };
