const API_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-api.com/api';

export const COLORS = {
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  secondary: '#5E5CE6',
  accent: '#FF9F0A',
  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  text: '#1C1C1E',
  textSecondary: '#3A3A3C',
  textLight: '#8E8E93',
  border: '#E5E5EA',
  divider: '#C6C6C8',

  white: '#FFFFFF',
  black: '#000000',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const SIZES = {
  // Named sizes
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,

  // Legacy / descriptive aliases
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,

  // Padding
  padding: 16,
  paddingSm: 8,
  paddingMd: 16,
  paddingLg: 24,

  // Radius
  radius: 12,
  radiusSmall: 8,
  radiusMd: 12,
  radiusLarge: 20,
  radiusXl: 24,
  radiusRound: 999,
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};

export default { COLORS, FONTS, SIZES, SHADOWS, FONT_SIZES };

// Shared glass card style
export const GLASS_STYLE = {
  backgroundColor: COLORS.surface,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 20,
};

export { API_URL };