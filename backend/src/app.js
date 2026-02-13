const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const incomeRoutes = require('./routes/incomes');
const budgetRoutes = require('./routes/budgets');
const analyticsRoutes = require('./routes/analytics');
const v1Routes = require('./routes/v1');
const sttRoutes = require('./routes/stt');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded receipt images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1', v1Routes);
app.use('/api/stt', sttRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
