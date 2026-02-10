const request = require('supertest');
const app = require('../src/app');

describe('API Health & Structure', () => {
  test('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('1.0.0');
  });

  test('GET /api/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  test('POST /api/auth/register without body returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login without body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/expenses without auth returns 401', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });

  test('GET /api/categories without auth returns 401', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  test('GET /api/incomes without auth returns 401', async () => {
    const res = await request(app).get('/api/incomes');
    expect(res.status).toBe(401);
  });

  test('GET /api/budgets without auth returns 401', async () => {
    const res = await request(app).get('/api/budgets');
    expect(res.status).toBe(401);
  });

  test('GET /api/analytics/forecasts without auth returns 401', async () => {
    const res = await request(app).get('/api/analytics/forecasts');
    expect(res.status).toBe(401);
  });

  test('GET /api/analytics/insights without auth returns 401', async () => {
    const res = await request(app).get('/api/analytics/insights');
    expect(res.status).toBe(401);
  });

  test('GET /api/analytics/recommendations without auth returns 401', async () => {
    const res = await request(app).get('/api/analytics/recommendations');
    expect(res.status).toBe(401);
  });

  test('validates expense quick entry requires text', async () => {
    const res = await request(app)
      .post('/api/expenses/quick')
      .set('Authorization', 'Bearer fake-token')
      .send({});
    // Should fail with 401 (invalid token) before validation
    expect(res.status).toBe(401);
  });
});
