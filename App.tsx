import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ThemeProvider from './src/theme/ThemeProvider';
import FirebaseHealthCheck from './src/screens/FirebaseHealthCheck';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FirebaseHealthCheck />
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
