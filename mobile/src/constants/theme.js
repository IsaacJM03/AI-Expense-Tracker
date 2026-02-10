const API_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

export const COLORS = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export { API_URL };
