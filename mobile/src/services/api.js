import { API_URL } from '../constants/theme';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === 'Network request failed') {
        throw new Error('No internet connection. Data will sync when online.');
      }
      throw error;
    }
  }

  // Auth
  async register(email, password, displayName) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Expenses
  async getExpenses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/expenses?${query}`);
  }

  async createExpense(data) {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async quickEntry(text) {
    return this.request('/expenses/quick', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getExpenseSummary(startDate, endDate) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const query = new URLSearchParams(params).toString();
    return this.request(`/expenses/summary?${query}`);
  }

  async updateExpense(id, data) {
    return this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id) {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Incomes
  async getIncomes() {
    return this.request('/incomes');
  }

  async createIncome(data) {
    return this.request('/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteIncome(id) {
    return this.request(`/incomes/${id}`, { method: 'DELETE' });
  }

  // Budgets
  async getBudgets() {
    return this.request('/budgets');
  }

  async getActiveBudgets() {
    return this.request('/budgets/active');
  }

  async createBudget(data) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id) {
    return this.request(`/budgets/${id}`, { method: 'DELETE' });
  }

  // Analytics
  async getForecasts() {
    return this.request('/analytics/forecasts');
  }

  async getInsights() {
    return this.request('/analytics/insights');
  }

  async getRecommendations() {
    return this.request('/analytics/recommendations');
  }

  async markInsightRead(id) {
    return this.request(`/analytics/insights/${id}/read`, { method: 'PATCH' });
  }

  async updateRecommendation(id, status) {
    return this.request(`/analytics/recommendations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export default new ApiService();
