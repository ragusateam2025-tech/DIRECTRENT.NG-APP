import { useCallback } from 'react';
import analytics from '@react-native-firebase/analytics';

interface UseAnalyticsResult {
  logEvent: (name: string, params?: Record<string, unknown>) => void;
  setUserProperty: (name: string, value: string) => void;
}

/**
 * Hook providing lightweight wrappers around Firebase Analytics.
 * Errors are silently swallowed so analytics never breaks the app.
 */
export function useAnalytics(): UseAnalyticsResult {
  const logEvent = useCallback(
    (name: string, params?: Record<string, unknown>): void => {
      analytics()
        .logEvent(name, params)
        .catch(() => {
          // analytics failures must never affect the user experience
        });
    },
    []
  );

  const setUserProperty = useCallback((name: string, value: string): void => {
    analytics()
      .setUserProperty(name, value)
      .catch(() => {
        // silent
      });
  }, []);

  return { logEvent, setUserProperty };
}
