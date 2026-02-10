# 🤖 AI Expense Tracker & Financial Planner

A production-ready, AI-powered mobile expense tracker and financial planning application that replaces spreadsheet-based personal finance tracking.

Built with **React Native** (mobile), **Node.js/Express** (backend), and **MySQL** (database), featuring intelligent expense parsing, automated categorization, spending forecasts, and actionable financial recommendations.

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [AI Pipeline](#-ai-pipeline)
- [Frontend Structure](#-frontend-structure)
- [Security](#-security)
- [MVP vs V1 Features](#-mvp-vs-v1-features)
- [Scalability](#-scalability)

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    React Native App                       │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │  Home/   │ │ Insights │ │Budget  │ │   Profile     │  │
│  │ Expenses │ │ Screen   │ │Screen  │ │   Screen      │  │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘  │
│       │             │           │              │          │
│  ┌────▼─────────────▼───────────▼──────────────▼───────┐ │
│  │              API Service Layer                       │ │
│  │         (fetch + offline queue)                      │ │
│  └────────────────────┬────────────────────────────────┘ │
└───────────────────────┼──────────────────────────────────┘
                        │ HTTPS / JWT
┌───────────────────────▼──────────────────────────────────┐
│                  Express.js API Server                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │   Auth   │ │ Expense  │ │  Budget  │ │  Analytics  │  │
│  │ Routes   │ │  Routes  │ │  Routes  │ │   Routes    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │             │            │              │         │
│  ┌────▼─────────────▼────────────▼──────────────▼──────┐ │
│  │              Controllers + Middleware                │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                   │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │                  AI Services                         │ │
│  │  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │ │
│  │  │ Expense  │ │ Category  │ │   Forecasting      │  │ │
│  │  │ Parser   │ │  Engine   │ │   (time-series)    │  │ │
│  │  └──────────┘ └───────────┘ └────────────────────┘  │ │
│  │  ┌──────────┐ ┌──────────────────────────────────┐  │ │
│  │  │ Insights │ │  Recommendations Generator       │  │ │
│  │  │ Engine   │ │  (contextual, actionable)         │  │ │
│  │  └──────────┘ └──────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                       │                                   │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │              MySQL Database                          │ │
│  │  users | expenses | categories | budgets | incomes   │ │
│  │  forecasts | insights | ai_recommendations           │ │
│  │  expense_raw_inputs                                  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 1️⃣ Expense Capture (Critical)

**Quick Entry** — Ultra-fast informal expense entry:
- Text: `"2000 lunch"`, `"5k transport"`
- Emoji: `🍔 8000`, `🚕 4000`
- AI parses: amount, category, timestamp, confidence score

**Receipt OCR** (planned):
- Camera capture → OCR → structured data
- Store both raw OCR text and parsed output
- One-tap confirmation flow

### 2️⃣ AI-Assisted Categorization
- Keywords + merchant history + user behavior
- User corrections improve future accuracy
- Hierarchical categories (Food → Eating Out)

### 3️⃣ Income Tracking
- Manual entry with recurring support
- Multiple income sources
- Monthly totals for forecasting

### 4️⃣ Behavior-Based Budgeting
- Budgets per category with adaptive amounts
- Based on historical patterns, not static limits
- Weekly, monthly, quarterly, yearly periods

### 5️⃣ Forecasting & Intelligence
- End-of-month balance prediction
- Budget overrun risk (high/medium/low)
- "Safe-to-spend" daily amount with safety buffer
- Expense velocity tracking

### 6️⃣ AI Recommendations
```
❌ Bad:  "Save more money"
✅ Good: "Reducing eating out by 2 days/week saves ~18,000/month"
🎯 Best: "Move 15,000 to savings every Monday based on your last 3 months"
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo |
| Navigation | React Navigation (Stack + Tab) |
| Backend | Node.js + Express |
| Database | MySQL (mysql2) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Security | Helmet, CORS, Rate Limiting |
| Validation | express-validator |
| Testing | Jest + Supertest |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Expo CLI (for mobile)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

npm install
npm run migrate    # Create database tables
npm run dev        # Start development server (port 3000)
```

### Mobile Setup

```bash
cd mobile
npm install
npx expo start     # Opens Expo DevTools
```

### Run Tests

```bash
cd backend
npm test           # 30 tests covering parser + API
```

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |

**Register Request:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepass123",
  "displayName": "John"
}
```

**Response:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "displayName": "John" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Create expense |
| POST | `/api/expenses/quick` | AI quick entry |
| GET | `/api/expenses` | List expenses (paginated) |
| GET | `/api/expenses/summary` | Category summary |
| GET | `/api/expenses/:id` | Get single expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |

**Quick Entry:**
```json
POST /api/expenses/quick
{ "text": "🍔 2000 lunch at Java" }

Response:
{
  "expense": { "id": "uuid", "amount": 2000, "source": "quick_entry" },
  "parsed": { "amount": 2000, "category": "Food & Dining", "confidence": 0.9 }
}
```

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List (hierarchical) |
| POST | `/api/categories` | Create custom |
| PUT | `/api/categories/:id` | Update |
| DELETE | `/api/categories/:id` | Delete (custom only) |

### Incomes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incomes` | Create income |
| GET | `/api/incomes` | List incomes |
| PUT | `/api/incomes/:id` | Update |
| DELETE | `/api/incomes/:id` | Delete |

### Budgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/budgets` | Create budget |
| GET | `/api/budgets` | List all |
| GET | `/api/budgets/active` | Active budgets |
| PUT | `/api/budgets/:id` | Update |
| DELETE | `/api/budgets/:id` | Delete |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/forecasts` | Forecasts + risks + safe-to-spend |
| GET | `/api/analytics/insights` | Spending insights |
| PATCH | `/api/analytics/insights/:id/read` | Mark insight read |
| GET | `/api/analytics/recommendations` | AI recommendations |
| PATCH | `/api/analytics/recommendations/:id` | Accept/dismiss |

### Error Handling

All errors return consistent JSON:
```json
{
  "error": "Human-readable message",
  "details": [{ "field": "email", "message": "Invalid email" }]
}
```

HTTP status codes: `400` validation, `401` auth, `404` not found, `409` conflict, `429` rate limit, `500` server error.

---

## 🗃 Database Schema

### Entity Relationship

```
users ──< expenses ──< expense_raw_inputs
  │           │
  │           ▼
  │       categories (self-referencing via parent_id)
  │
  ├──< incomes
  ├──< budgets ──> categories
  ├──< forecasts ──> categories
  ├──< insights
  └──< ai_recommendations
```

### Tables

| Table | Purpose | Key Design Choice |
|-------|---------|-------------------|
| `users` | Identity data | Separated from financial data for security |
| `expenses` | Core financial records | Indexed on (user_id, expense_date) for fast range queries |
| `expense_raw_inputs` | Preserves original input | Never overwrite raw user data |
| `categories` | Hierarchical via parent_id | System defaults + user-editable |
| `incomes` | Income tracking | Supports recurring with interval types |
| `budgets` | Behavior-based budgets | `is_adaptive` flag + `baseline_amount` for auto-adjustment |
| `forecasts` | AI predictions | Versioned with `model_version` for A/B testing |
| `insights` | Pattern observations | Priority-ranked, expirable, read-tracking |
| `ai_recommendations` | Actionable advice | Status workflow (pending → accepted/dismissed) |

### Design Decisions

- **UUIDs** as primary keys for distributed-friendly IDs
- **DECIMAL(15,2)** for all financial amounts (no floating point errors)
- **utf8mb4** charset for emoji support in descriptions
- **Composite indexes** on common query patterns
- **Soft relationships** via SET NULL for non-critical FKs
- **JSON columns** for flexible parsed data storage

---

## 🤖 AI Pipeline

### What is Rule-Based
| Component | Method |
|-----------|--------|
| Amount extraction | Regex patterns (1000, 5k, 5,000) |
| Emoji → Category | Static mapping table |
| Keyword → Category | Dictionary lookup |
| Budget tracking | Arithmetic on historical data |
| Forecast projections | Rolling averages + linear projection |

### What Uses ML (Planned)
| Component | Method |
|-----------|--------|
| Category prediction | Collaborative filtering on user history |
| Anomaly detection | Statistical outlier detection |
| Seasonal patterns | Time-series decomposition |

### What Uses LLMs (Planned)
| Component | Method |
|-----------|--------|
| Complex text parsing | GPT for ambiguous entries |
| OCR output cleaning | LLM post-processing |
| Insight generation | Natural language descriptions |
| Recommendation text | Contextual, personalized advice |

### AI Pipeline Flow

```
User Input (text/emoji/OCR)
     │
     ▼
┌──────────────┐
│ Amount Parser │ ◄── Regex (rule-based)
│  "5k" → 5000 │
└──────┬───────┘
       ▼
┌──────────────┐
│  Category    │ ◄── 1. Emoji map (rule-based)
│  Detection   │ ◄── 2. Keywords (rule-based)
│              │ ◄── 3. Merchant history (data)
│              │ ◄── 4. User patterns (data)
│              │ ◄── 5. LLM fallback (future)
└──────┬───────┘
       ▼
┌──────────────┐
│ Store Expense│ → expenses table
│ + Raw Input  │ → expense_raw_inputs table
└──────┬───────┘
       ▼
┌──────────────┐
│  Analytics   │ ◄── Time-series (rule-based)
│  Pipeline    │ ◄── NOT LLMs
│  Forecasts   │
│  Insights    │
│  Recommends  │
└──────────────┘
```

---

## 📱 Frontend Structure

```
mobile/src/
├── App.js                      # Entry point
├── constants/
│   └── theme.js                # Colors, fonts, API URL
├── context/
│   └── AuthContext.js          # Authentication state
├── navigation/
│   └── AppNavigator.js         # Stack + Tab navigation
├── screens/
│   ├── LoginScreen.js          # Email/password login
│   ├── RegisterScreen.js       # Account creation
│   ├── HomeScreen.js           # Expenses list + quick entry
│   ├── InsightsScreen.js       # Forecasts, insights, recommendations
│   ├── BudgetScreen.js         # Budget management
│   ├── AddExpenseScreen.js     # Manual expense form
│   ├── ProfileScreen.js        # Account settings, V1 feature access
│   ├── ScanReceiptScreen.js    # OCR receipt processing (V1)
│   ├── SeasonalScreen.js       # Seasonal spending analysis (V1)
│   ├── CurrencyScreen.js       # Multi-currency selector (V1)
│   └── ExportScreen.js         # Data export CSV/report (V1)
└── services/
    ├── api.js                  # REST API client
    └── offlineSync.js          # Offline queue with retry (V1)
```

---

## 🔐 Security

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT with bcrypt (12 rounds) |
| Transport | HTTPS enforced in production |
| Headers | Helmet.js security headers |
| Rate Limiting | 100 requests / 15 minutes |
| Input Validation | express-validator on all endpoints |
| Password Storage | bcryptjs hash (never plaintext) |
| Data Separation | Identity (users) separate from financial data |
| Raw Data Preservation | Original inputs never overwritten |
| Data Ownership | Export endpoint (user owns their data) |

---

## 🎯 MVP vs V1 Features

### MVP (Current)
- [x] User registration & JWT auth
- [x] Manual expense entry
- [x] Quick text entry with AI parsing
- [x] Auto-categorization (keyword + emoji)
- [x] Hierarchical categories (10 parents + children)
- [x] Income tracking (manual + recurring)
- [x] Budget management (adaptive)
- [x] End-of-month forecast
- [x] Budget overrun risk assessment
- [x] Safe-to-spend calculation
- [x] Spending insights (weekend patterns, trends)
- [x] AI recommendations (savings, budget adjust, spending cuts)
- [x] React Native screens (login, home, insights, budgets, profile)
- [x] RESTful API with validation
- [x] 30 automated tests

### V1 (Implemented)
- [x] Receipt OCR (text → structured data with merchant, total, date, line items)
- [x] Offline-first with sync queue (mobile queue service with retry logic)
- [x] Seasonal spending analysis (monthly, day-of-week, pay-cycle correlation, category peaks)
- [x] Multi-currency support (15 currencies with conversion + formatting)
- [x] Data export (CSV for expenses and incomes, full report)
- [x] 4 new React Native screens (Scan Receipt, Seasonal Analysis, Currency, Export)
- [x] 24 new V1 tests (54 total)

### V2 (Implemented)
- [x] Fixed Expo "main" registration error (AppRegistry.registerComponent)
- [x] Liquid Glass UI redesign (dark translucent theme inspired by Apple's design language)
- [x] LLM integration service (OpenAI-compatible API with rule-based fallback)
- [x] Smart expense parsing via LLM (`POST /api/v1/ai/parse`)
- [x] LLM-powered category prediction (`POST /api/v1/ai/categorize`)
- [x] AI-enhanced insights generation (`GET /api/v1/ai/insights`)
- [x] LLM-enhanced OCR receipt parsing (falls back to rule-based)
- [x] AI status endpoint (`GET /api/v1/ai/status`)
- [x] 63 total tests passing

### V3 (Planned)
- [ ] Voice input for expenses
- [ ] Push notifications for budget alerts
- [ ] Camera-based OCR capture
- [ ] Shared household budgets
- [ ] PDF export
- [ ] Biometric authentication

---

## 🔌 V1 API Endpoints

### Data Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/export/expenses` | Export expenses as CSV |
| GET | `/api/v1/export/incomes` | Export incomes as CSV |
| GET | `/api/v1/export/all` | Full financial report (JSON) |

### Currency

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/currencies` | List 15 supported currencies |
| GET | `/api/v1/currencies/convert?amount=100&from=USD&to=KES` | Convert between currencies |

### Seasonal Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/seasonal` | Full seasonal analysis (monthly, day-of-week, pay-cycle, category peaks) |

### OCR Receipt Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ocr/receipt` | Process receipt text → structured expense |

**OCR Request:**
```json
POST /api/v1/ocr/receipt
{
  "ocrText": "Java House\n2024-01-15\nCoffee 350\nSandwich 500\nTotal: 850"
}
```

**Response:**
```json
{
  "expense": { "id": "uuid", "amount": 850, "source": "ocr" },
  "parsed": {
    "merchant": "Java House",
    "total": 850,
    "date": "2024-01-15",
    "lineItems": [
      { "name": "Coffee", "amount": 350 },
      { "name": "Sandwich", "amount": 500 }
    ],
    "confidence": 1.0
  },
  "needsConfirmation": false
}

---

## 🤖 LLM / AI API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ai/status` | Check AI configuration and available features |
| POST | `/api/v1/ai/parse` | Smart parse free-text expense (LLM → rule-based fallback) |
| POST | `/api/v1/ai/categorize` | Predict category for expense description |
| GET | `/api/v1/ai/insights` | Generate AI-powered spending insights |

**Smart Parse:**
```json
POST /api/v1/ai/parse
{ "text": "spent 5k on uber to the airport" }

// Response (LLM configured):
{ "amount": 5000, "category": "Transport", "description": "Uber to the airport", "confidence": 0.92, "source": "llm" }

// Response (fallback):
{ "amount": 5000, "category": "Transport", "confidence": 0.75, "source": "rule-based" }
```

**AI Status:**
```json
GET /api/v1/ai/status
{
  "llmConfigured": true,
  "features": { "smartParse": true, "smartCategorize": true, "smartInsights": true, "ocrEnhanced": true },
  "model": "gpt-4o",
  "fallback": "rule-based"
}
```

### Configuration

Set these environment variables to enable LLM features:
```bash
LLM_API_KEY=your-api-key        # Required: OpenAI, GitHub Copilot, or compatible API key
LLM_API_URL=https://api.openai.com/v1/chat/completions  # Optional: API endpoint
LLM_MODEL=gpt-4o                # Optional: Model to use
```

When `LLM_API_KEY` is not set, all AI endpoints gracefully fall back to rule-based logic.

---

## 📈 Scalability Strategy

| Aspect | Strategy |
|--------|----------|
| Database | Read replicas, connection pooling (10 connections), indexed queries |
| API | Stateless services, horizontal scaling behind load balancer |
| Caching | Redis for frequent analytics queries (planned) |
| AI Processing | Async job queue for insights generation (planned) |
| Mobile | Offline queue with background sync (implemented) |
| Storage | S3/GCS for receipt images (planned) |
| Currency | Static fallback rates + live API integration (planned) |

---

## 📄 License

MIT

---

Built with ❤️ for real users managing real money.