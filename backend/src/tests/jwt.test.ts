import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  parseDurationMs,
  type JwtPayload,
} from '@/lib/jwt.js';

const payload: JwtPayload = { userId: 'u1', role: 'STUDENT', email: 'a@b.com' };

describe('signAccessToken / verifyAccessToken', () => {
  it('signs and verifies correctly', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.role).toBe('STUDENT');
  });

  it('throws on tampered token', () => {
    expect(() => verifyAccessToken(signAccessToken(payload) + 'x')).toThrow();
  });

  it('refresh token does not verify as access token', () => {
    expect(() => verifyAccessToken(signRefreshToken(payload))).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('signs and verifies correctly', () => {
    const decoded = verifyRefreshToken(signRefreshToken(payload));
    expect(decoded.userId).toBe('u1');
  });

  it('throws on tampered token', () => {
    expect(() => verifyRefreshToken(signRefreshToken(payload) + 'x')).toThrow();
  });
});

describe('decodeToken', () => {
  it('decodes without verifying', () => {
    const decoded = decodeToken(signAccessToken(payload));
    expect(decoded?.userId).toBe('u1');
  });

  it('returns null for a malformed token', () => {
    expect(decodeToken('not.a.jwt')).toBeNull();
  });
});

describe('parseDurationMs', () => {
  it('parses seconds', () => expect(parseDurationMs('30s')).toBe(30_000));
  it('parses minutes', () => expect(parseDurationMs('15m')).toBe(15 * 60 * 1000));
  it('parses hours', () => expect(parseDurationMs('2h')).toBe(2 * 60 * 60 * 1000));
  it('parses days', () => expect(parseDurationMs('30d')).toBe(30 * 24 * 60 * 60 * 1000));
  it('defaults to seconds for unknown unit', () => expect(parseDurationMs('100x')).toBe(100_000));
});
