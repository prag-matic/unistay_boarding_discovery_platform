/**
 * Tests for lib/storage.ts
 * Native modules are mocked:
 *   - expo-secure-store   → __mocks__/expo-secure-store.ts
 *   - @react-native-async-storage/async-storage → jest/async-storage-mock
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store');

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { storage } from '../lib/storage';
import { STORAGE_KEYS } from '../lib/constants';

const secureGetMock = SecureStore.getItemAsync as jest.Mock;
const secureSetMock = SecureStore.setItemAsync as jest.Mock;
const secureDelMock = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage as jest.Mocked<typeof AsyncStorage>).clear();
});

// ─── Token ─────────────────────────────────────────────────────────────────

describe('getToken / setToken / removeToken', () => {
  it('stores and retrieves the access token via SecureStore', async () => {
    secureSetMock.mockResolvedValueOnce(undefined);
    secureGetMock.mockResolvedValueOnce('access-token-123');

    await storage.setToken('access-token-123');
    const token = await storage.getToken();

    expect(secureSetMock).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN, 'access-token-123');
    expect(token).toBe('access-token-123');
  });

  it('falls back to AsyncStorage when SecureStore.getItemAsync throws', async () => {
    secureGetMock.mockRejectedValueOnce(new Error('SecureStore unavailable'));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, 'fallback-token');

    const token = await storage.getToken();
    expect(token).toBe('fallback-token');
  });

  it('falls back to AsyncStorage when SecureStore.setItemAsync throws', async () => {
    secureSetMock.mockRejectedValueOnce(new Error('SecureStore unavailable'));

    await storage.setToken('async-token');
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(stored).toBe('async-token');
  });

  it('removes token from SecureStore', async () => {
    secureDelMock.mockResolvedValueOnce(undefined);

    await storage.removeToken();
    expect(secureDelMock).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN);
  });

  it('falls back to AsyncStorage removeItem when SecureStore.deleteItemAsync throws', async () => {
    secureDelMock.mockRejectedValueOnce(new Error('unavailable'));
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, 'to-remove');

    await storage.removeToken();
    const val = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(val).toBeNull();
  });
});

// ─── Refresh Token ─────────────────────────────────────────────────────────

describe('getRefreshToken / setRefreshToken / removeRefreshToken', () => {
  it('stores and retrieves the refresh token via SecureStore', async () => {
    secureSetMock.mockResolvedValueOnce(undefined);
    secureGetMock.mockResolvedValueOnce('refresh-token-xyz');

    await storage.setRefreshToken('refresh-token-xyz');
    const token = await storage.getRefreshToken();

    expect(secureSetMock).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token-xyz');
    expect(token).toBe('refresh-token-xyz');
  });

  it('falls back to AsyncStorage when SecureStore throws on get', async () => {
    secureGetMock.mockRejectedValueOnce(new Error('unavailable'));
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'async-refresh');

    const token = await storage.getRefreshToken();
    expect(token).toBe('async-refresh');
  });

  it('removes refresh token', async () => {
    secureDelMock.mockResolvedValueOnce(undefined);

    await storage.removeRefreshToken();
    expect(secureDelMock).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
  });
});

// ─── User ──────────────────────────────────────────────────────────────────

describe('getUser / setUser / removeUser', () => {
  it('serialises and stores user to AsyncStorage', async () => {
    const user = { id: '1', firstName: 'Alice', email: 'alice@example.com' };
    await storage.setUser(user);

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    expect(JSON.parse(raw!)).toEqual(user);
  });

  it('deserialises and returns stored user', async () => {
    const user = { id: '2', firstName: 'Bob' };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

    const result = await storage.getUser<typeof user>();
    expect(result).toEqual(user);
  });

  it('returns null when no user is stored', async () => {
    const result = await storage.getUser();
    expect(result).toBeNull();
  });

  it('removes user from AsyncStorage', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: '3' }));

    await storage.removeUser();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    expect(raw).toBeNull();
  });
});

// ─── Onboarding ────────────────────────────────────────────────────────────

describe('isOnboardingDone / setOnboardingDone', () => {
  it('returns false when onboarding has not been marked done', async () => {
    const result = await storage.isOnboardingDone();
    expect(result).toBe(false);
  });

  it('returns true after setOnboardingDone is called', async () => {
    await storage.setOnboardingDone();
    const result = await storage.isOnboardingDone();
    expect(result).toBe(true);
  });
});

// ─── clear ────────────────────────────────────────────────────────────────

describe('clear', () => {
  it('removes user, onboarding flag, access token, and refresh token', async () => {
    // Setup data in AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: '1' }));
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    secureDelMock.mockResolvedValue(undefined);

    await storage.clear();

    expect(await AsyncStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)).toBeNull();
    // SecureStore.deleteItemAsync should be called for both token keys
    const deletedKeys = secureDelMock.mock.calls.map(([k]: [string]) => k);
    expect(deletedKeys).toContain(STORAGE_KEYS.TOKEN);
    expect(deletedKeys).toContain(STORAGE_KEYS.REFRESH_TOKEN);
  });
});
