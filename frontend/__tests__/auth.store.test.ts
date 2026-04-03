/**
 * Tests for store/auth.store.ts
 *
 * Mocked:
 *   - lib/api        → axios instance
 *   - lib/storage    → async token / user storage
 *   - lib/user       → getCurrentUserProfile / updateCurrentUserProfile
 *   - expo-router    → router (to prevent navigation side-effects)
 */

jest.mock('../lib/api');
jest.mock('../lib/storage');
jest.mock('../lib/user');
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

import { act } from 'react';
import api from '../lib/api';
import { storage } from '../lib/storage';
import { getCurrentUserProfile, updateCurrentUserProfile } from '../lib/user';
import { useAuthStore } from '../store/auth.store';

const mockPost = api.post as jest.Mock;
const mockStorageSetToken = storage.setToken as jest.Mock;
const mockStorageSetRefreshToken = storage.setRefreshToken as jest.Mock;
const mockStorageGetRefreshToken = storage.getRefreshToken as jest.Mock;
const mockStorageGetToken = storage.getToken as jest.Mock;
const mockStorageGetUser = storage.getUser as jest.Mock;
const mockStorageSetUser = storage.setUser as jest.Mock;
const mockStorageClear = storage.clear as jest.Mock;
const mockGetCurrentUserProfile = getCurrentUserProfile as jest.Mock;
const mockUpdateCurrentUserProfile = updateCurrentUserProfile as jest.Mock;

const mockUser = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  role: 'STUDENT' as const,
  profileImageUrl: null,
  phone: undefined,
  university: 'UniA',
};

const loginResponse = {
  data: {
    success: true,
    message: 'ok',
    data: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: mockUser,
    },
  },
};

const refreshResponse = {
  data: {
    success: true,
    message: 'ok',
    data: {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    },
  },
};

// Reset store and mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  act(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      selectedRole: null,
    });
  });
  mockStorageSetToken.mockResolvedValue(undefined);
  mockStorageSetRefreshToken.mockResolvedValue(undefined);
  mockStorageSetUser.mockResolvedValue(undefined);
  mockStorageClear.mockResolvedValue(undefined);
  mockGetCurrentUserProfile.mockResolvedValue(mockUser);
});

// ─── setUser / setToken / setSelectedRole (synchronous) ─────────────────────

describe('setUser', () => {
  it('sets user in store', () => {
    act(() => useAuthStore.getState().setUser(mockUser));
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});

describe('setToken', () => {
  it('sets token in store', () => {
    act(() => useAuthStore.getState().setToken('tok'));
    expect(useAuthStore.getState().token).toBe('tok');
  });
});

describe('setSelectedRole', () => {
  it('sets selectedRole', () => {
    act(() => useAuthStore.getState().setSelectedRole('owner'));
    expect(useAuthStore.getState().selectedRole).toBe('owner');
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('login', () => {
  it('posts credentials, stores tokens, fetches profile, and sets authenticated state', async () => {
    mockPost.mockResolvedValueOnce(loginResponse);

    await act(async () => {
      await useAuthStore.getState().login('alice@example.com', 'Password1');
    });

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'alice@example.com',
      password: 'Password1',
    });
    expect(mockStorageSetToken).toHaveBeenCalledWith('access-token');
    expect(mockStorageSetRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockGetCurrentUserProfile).toHaveBeenCalled();
    expect(mockStorageSetUser).toHaveBeenCalled();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.user?.email).toBe('alice@example.com');
    expect(state.isLoading).toBe(false);
  });

  it('sets isLoading false even when login fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      try {
        await useAuthStore.getState().login('x@example.com', 'bad');
      } catch {
        // expected
      }
    });

    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── register ────────────────────────────────────────────────────────────────

describe('register', () => {
  it('posts to /auth/register with role uppercased and strips confirmPassword/terms', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      await useAuthStore.getState().register({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'Password1',
        role: 'student',
        confirmPassword: 'Password1',
        terms: true,
      } as Parameters<typeof useAuthStore.getState.call>[0]);
    });

    const body = mockPost.mock.calls[0][1];
    expect(mockPost).toHaveBeenCalledWith('/auth/register', expect.any(Object));
    expect(body.role).toBe('STUDENT');
    expect(body).not.toHaveProperty('confirmPassword');
    expect(body).not.toHaveProperty('terms');
  });

  it('maps owner role to OWNER', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      await useAuthStore.getState().register({
        firstName: 'Bob',
        lastName: 'Owner',
        email: 'bob@example.com',
        password: 'Password1',
        role: 'owner',
      } as Parameters<typeof useAuthStore.getState.call>[0]);
    });

    expect(mockPost.mock.calls[0][1].role).toBe('OWNER');
  });

  it('sets isLoading false after registration fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Server error'));

    await act(async () => {
      try {
        await useAuthStore.getState().register({ role: 'student' } as Parameters<typeof useAuthStore.getState.call>[0]);
      } catch {
        // expected
      }
    });

    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('calls /auth/logout with the stored refreshToken, clears storage, and resets state', async () => {
    act(() => {
      useAuthStore.setState({ refreshToken: 'rt', token: 'tok', user: mockUser, isAuthenticated: true });
    });
    mockPost.mockResolvedValueOnce({ data: {} });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(mockPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt' });
    expect(mockStorageClear).toHaveBeenCalled();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('still clears state even if logout API call fails', async () => {
    act(() => {
      useAuthStore.setState({ refreshToken: 'rt', isAuthenticated: true });
    });
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockStorageClear).toHaveBeenCalled();
  });

  it('reads refreshToken from storage when store has none', async () => {
    mockStorageGetRefreshToken.mockResolvedValueOnce('stored-rt');
    mockPost.mockResolvedValueOnce({ data: {} });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(mockPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'stored-rt' });
  });
});

// ─── checkAuth ────────────────────────────────────────────────────────────────

describe('checkAuth', () => {
  it('returns false when no refresh token in storage', async () => {
    mockStorageGetRefreshToken.mockResolvedValueOnce(null);

    let result: boolean = true;
    await act(async () => {
      result = await useAuthStore.getState().checkAuth();
    });

    expect(result).toBe(false);
  });

  it('refreshes tokens, fetches profile, and returns true on success', async () => {
    mockStorageGetRefreshToken.mockResolvedValueOnce('rt');
    mockPost.mockResolvedValueOnce(refreshResponse);
    mockStorageGetUser.mockResolvedValueOnce(mockUser);

    let result: boolean = false;
    await act(async () => {
      result = await useAuthStore.getState().checkAuth();
    });

    expect(result).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'rt' });
    expect(mockStorageSetToken).toHaveBeenCalledWith('new-access-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('returns false and calls logout when refresh fails', async () => {
    mockStorageGetRefreshToken.mockResolvedValueOnce('bad-rt');
    mockPost.mockRejectedValueOnce(new Error('Expired'));

    let result: boolean = true;
    await act(async () => {
      result = await useAuthStore.getState().checkAuth();
    });

    expect(result).toBe(false);
    expect(mockStorageClear).toHaveBeenCalled();
  });
});

// ─── hydrate ──────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('does nothing when no token in storage', async () => {
    mockStorageGetToken.mockResolvedValueOnce(null);
    mockStorageGetRefreshToken.mockResolvedValueOnce(null);
    mockStorageGetUser.mockResolvedValueOnce(null);

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sets authenticated state from storage when all values present', async () => {
    mockStorageGetToken.mockResolvedValueOnce('tok');
    mockStorageGetRefreshToken.mockResolvedValueOnce('rt');
    mockStorageGetUser.mockResolvedValueOnce(mockUser);

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('tok');
  });

  it('falls back to stored user when getCurrentUserProfile fails', async () => {
    mockStorageGetToken.mockResolvedValueOnce('tok');
    mockStorageGetRefreshToken.mockResolvedValueOnce('rt');
    mockStorageGetUser.mockResolvedValueOnce(mockUser);
    mockGetCurrentUserProfile.mockRejectedValueOnce(new Error('Offline'));

    await act(async () => {
      await useAuthStore.getState().hydrate();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('calls updateCurrentUserProfile, merges result, and persists to storage', async () => {
    const updatedUser = { ...mockUser, firstName: 'Alicia' };
    act(() => useAuthStore.setState({ user: mockUser }));
    mockUpdateCurrentUserProfile.mockResolvedValueOnce(updatedUser);

    await act(async () => {
      await useAuthStore.getState().updateProfile({ firstName: 'Alicia' });
    });

    expect(mockUpdateCurrentUserProfile).toHaveBeenCalledWith({ firstName: 'Alicia' });
    expect(mockStorageSetUser).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.firstName).toBe('Alicia');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

// ─── refreshProfile ───────────────────────────────────────────────────────────

describe('refreshProfile', () => {
  it('fetches fresh profile and merges with current user', async () => {
    const freshUser = { ...mockUser, phone: '0712345678' };
    act(() => useAuthStore.setState({ user: mockUser }));
    mockGetCurrentUserProfile.mockResolvedValueOnce(freshUser);

    await act(async () => {
      await useAuthStore.getState().refreshProfile();
    });

    expect(mockGetCurrentUserProfile).toHaveBeenCalled();
    expect(mockStorageSetUser).toHaveBeenCalled();
    expect(useAuthStore.getState().user?.phone).toBe('0712345678');
  });
});
