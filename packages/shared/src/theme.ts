import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1B5E20',
    primaryContainer: '#A5D6A7',
    secondary: '#FF6F00',
    secondaryContainer: '#FFE0B2',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    error: '#D32F2F',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#212121',
    onSurface: '#212121',
  },
};

export type AppTheme = typeof theme;
