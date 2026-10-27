export const tokens = {
  colors: {
    primary: '#145C43',          // Primary Forest Green
    primaryHover: '#0F4935',     // Deep Forest Green
    primaryEmerald: '#16865D',   // Primary Emerald
    primaryDark: '#0D3B2B',
    mintLight: '#EAF6EF',        // Light Mint Accent
    mintSurface: '#F2FAF5',
    membershipOrange: '#E87A1E', // Membership Highlight Orange
    membershipBg: '#FFF4EB',     // Membership Cream/Orange Surface
    bgMain: '#F7F9F7',           // Main App Background
    cardBg: '#FFFFFF',           // Card Background
    white: '#FFFFFF',
    text: '#17211C',             // Main Text
    textSecondary: '#6B756F',    // Secondary Text
    textMuted: '#8E9992',        // Muted Text
    border: '#E4EAE5',           // Border
    borderHover: '#C5D1C7',
    success: '#188653',          // Semantic Success
    warning: '#D99118',          // Semantic Warning
    error: '#D64545',            // Semantic Error
    danger: '#D64545',
  },
  radii: {
    xs: '4px',
    sm: '8px',
    control: '10px',
    card: '16px',
    lg: '20px',
    xl: '28px',
    full: '9999px',
  },
  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(23, 33, 28, 0.04)',
    sm: '0 1px 3px 0 rgba(23, 33, 28, 0.06), 0 1px 2px -1px rgba(23, 33, 28, 0.04)',
    md: '0 4px 6px -1px rgba(23, 33, 28, 0.07), 0 2px 4px -2px rgba(23, 33, 28, 0.05)',
    lg: '0 10px 15px -3px rgba(23, 33, 28, 0.08), 0 4px 6px -4px rgba(23, 33, 28, 0.04)',
    xl: '0 20px 25px -5px rgba(23, 33, 28, 0.1), 0 8px 10px -6px rgba(23, 33, 28, 0.04)',
  },
} as const;

export type DesignTokens = typeof tokens;
