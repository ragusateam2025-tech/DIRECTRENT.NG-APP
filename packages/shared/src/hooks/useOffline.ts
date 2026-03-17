import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface UseOfflineResult {
  isOffline: boolean;
  isConnected: boolean;
}

/**
 * Hook that subscribes to network connectivity changes.
 * `isOffline` is true when there is no internet connection.
 */
export function useOffline(): UseOfflineResult {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Check current state immediately
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isOffline: !isConnected, isConnected };
}
