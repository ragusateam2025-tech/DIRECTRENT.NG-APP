import AsyncStorage from '@react-native-async-storage/async-storage';

/** Well-known AsyncStorage key constants */
export const STORAGE_KEYS = {
  USER_PROFILE: '@directrent/user_profile',
  AUTH_TOKEN: '@directrent/auth_token',
  SAVED_PROPERTIES: '@directrent/saved_properties',
  RECENT_SEARCHES: '@directrent/recent_searches',
  DRAFT_APPLICATION: '@directrent/draft_application',
  FCM_TOKEN: '@directrent/fcm_token',
  ONBOARDING_COMPLETE: '@directrent/onboarding_complete',
  SEARCH_FILTERS: '@directrent/search_filters',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Persist any JSON-serialisable value under the given key.
 */
export async function storeData(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Retrieve and parse a stored value. Returns null on miss or parse error.
 */
export async function getData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Remove a single key from storage.
 */
export async function removeData(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/**
 * Clear all keys managed by AsyncStorage.
 */
export async function clearAll(): Promise<void> {
  await AsyncStorage.clear();
}
