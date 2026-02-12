import { API_URL } from '../constants/theme';
import * as SecureStore from 'expo-secure-store';

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
    // Ensure token is available (fallback to secure store if needed)
    if (!this.token) {
      try {
        const stored = await SecureStore.getItemAsync('token');
        if (stored) this.token = stored;
      } catch (e) {
        // ignore
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };
    console.debug('[API] using token?', !!this.token);
    console.debug('[API] request', endpoint, { url, headers, method: options.method || 'GET' });

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        console.debug('[API] response error', endpoint, response.status, data);
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

  async updateBudget(id, data) {
    return this.request(`/budgets/${id}`, {
      method: 'PUT',
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

  // V1: Data Export
  async exportExpenses(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/v1/export/expenses?${query}`);
  }

  async exportIncomes() {
    return this.request('/v1/export/incomes');
  }

  async exportAll() {
    return this.request('/v1/export/all');
  }

  // V1: Currency
  async getCurrencies() {
    return this.request('/v1/currencies');
  }

  async convertCurrency(amount, from, to) {
    return this.request(`/v1/currencies/convert?amount=${amount}&from=${from}&to=${to}`);
  }

  // V1: Seasonal Analysis
  async getSeasonalAnalysis() {
    return this.request('/v1/analytics/seasonal');
  }

  // V1: OCR Receipt
  async processReceipt(ocrText) {
    return this.request('/v1/ocr/receipt', {
      method: 'POST',
      body: JSON.stringify({ ocrText }),
    });
  }

  async uploadReceiptImage(imageUri) {
    const url = `${this.baseUrl}/v1/ocr/receipt/upload`;
    const formData = new FormData();

    // Determine file extension and mime type from URI
    const uriParts = imageUri.split('.');
    const ext = uriParts[uriParts.length - 1] || 'jpg';
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf' };
    const mimeType = mimeMap[ext.toLowerCase()] || 'image/jpeg';

    formData.append('receipt', {
      uri: imageUri,
      name: `receipt.${ext}`,
      type: mimeType,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          // Let fetch set Content-Type with boundary for multipart
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      if (error.message === 'Network request failed') {
        throw new Error('No internet connection. Please try again when online.');
      }
      throw error;
    }
  }

  // V1: AI/LLM endpoints
  async getAIStatus() {
    return this.request('/v1/ai/status');
  }

  async smartParse(text) {
    return this.request('/v1/ai/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async smartCategorize(description, merchant) {
    return this.request('/v1/ai/categorize', {
      method: 'POST',
      body: JSON.stringify({ description, merchant }),
    });
  }

  async smartInsights() {
    return this.request('/v1/ai/insights');
  }

  async getAssistantPermission() {
    return this.request('/v1/ai/permission');
  }

  async grantAssistantPermission() {
    return this.request('/v1/ai/permission/grant', { method: 'POST' });
  }

  async revokeAssistantPermission() {
    return this.request('/v1/ai/permission/revoke', { method: 'POST' });
  }

  async chatWithLLM(message) {
    return this.request('/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Profile update
  async updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();
