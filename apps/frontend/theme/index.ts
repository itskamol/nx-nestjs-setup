import { Theme } from '../types/theme';

export const lightTheme: Theme = {
  colors: {
    primary: {
      main: '#1976D2',
      light: '#E3F2FD',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#DC004E',
      light: '#FCE4EC',
      dark: '#880E4F',
    },
    success: {
      main: '#4CAF50',
      light: '#E8F5E8',
      dark: '#1B5E20',
    },
    warning: {
      main: '#FF9800',
      light: '#FFF3E0',
      dark: '#E65100',
    },
    error: {
      main: '#F44336',
      light: '#FFEBEE',
      dark: '#B71C1C',
    },
    background: {
      main: '#F5F5F5',
      secondary: '#FFFFFF',
      disabled: '#F0F0F0',
      hover: '#F0F0F0',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
    },
    border: {
      main: '#E0E0E0',
      light: '#F5F5F5',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '32px',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 8px rgba(0,0,0,0.1)',
    lg: '0 8px 16px rgba(0,0,0,0.1)',
    xl: '0 16px 32px rgba(0,0,0,0.1)',
  },
};

export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: {
      main: '#121212',
      secondary: '#1E1E1E',
      disabled: '#2C2C2C',
      hover: '#2C2C2C',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
      disabled: '#666666',
    },
    border: {
      main: '#333333',
      light: '#2C2C2C',
    },
  },
};
