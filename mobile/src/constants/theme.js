const API_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

// Liquid Glass Design System — inspired by Apple's translucent UI language
export const COLORS = {
  // Core palette
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  secondary: '#34C759',
  accent: '#AF52DE',
  danger: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',

  // Backgrounds
  background: '#000000',
  backgroundSecondary: '#1C1C1E',
  surface: 'rgba(28, 28, 30, 0.8)',
  surfaceElevated: 'rgba(44, 44, 46, 0.7)',

  // Glass effect colors
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  border: 'rgba(84, 84, 88, 0.36)',

  // Gradients (as color pairs)
  gradientPrimary: ['#007AFF', '#5856D6'],
  gradientSuccess: ['#34C759', '#30D158'],
  gradientAccent: ['#AF52DE', '#BF5AF2'],
  gradientWarm: ['#FF9500', '#FF6B00'],
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 34,
  hero: 56,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Shared glass card style
export const GLASS_STYLE = {
  backgroundColor: COLORS.glass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: 20,
};

export { API_URL };
