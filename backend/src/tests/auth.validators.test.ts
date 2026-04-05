import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  logoutSchema,
} from '@/schemas/auth.validators.js';

const validReg = { email: 'user@example.com', password: 'Password1', firstName: 'John', lastName: 'Doe' };

describe('registerSchema', () => {
  it('accepts valid data', () => expect(() => registerSchema.parse(validReg)).not.toThrow());
  it('rejects invalid email', () => expect(() => registerSchema.parse({ ...validReg, email: 'bad' })).toThrow());
  it('rejects short password', () => expect(() => registerSchema.parse({ ...validReg, password: 'P1' })).toThrow());
  it('rejects password without uppercase', () => expect(() => registerSchema.parse({ ...validReg, password: 'password1' })).toThrow());
  it('rejects password without number', () => expect(() => registerSchema.parse({ ...validReg, password: 'Password' })).toThrow());
  it('rejects empty firstName', () => expect(() => registerSchema.parse({ ...validReg, firstName: '' })).toThrow());
  it('defaults role to STUDENT', () => expect(registerSchema.parse(validReg).role).toBe('STUDENT'));
  it('accepts OWNER role', () => expect(registerSchema.parse({ ...validReg, role: 'OWNER' }).role).toBe('OWNER'));
  it('accepts optional phone/university', () => {
    const r = registerSchema.parse({ ...validReg, phone: '+94771234567', university: 'UOM' });
    expect(r.phone).toBe('+94771234567');
  });
});

describe('loginSchema', () => {
  it('accepts valid credentials', () => expect(() => loginSchema.parse({ email: 'a@b.com', password: 's' })).not.toThrow());
  it('rejects invalid email', () => expect(() => loginSchema.parse({ email: 'bad', password: 's' })).toThrow());
  it('rejects empty password', () => expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow());
});

describe('refreshTokenSchema', () => {
  it('accepts non-empty token', () => expect(() => refreshTokenSchema.parse({ refreshToken: 'tok' })).not.toThrow());
  it('rejects empty token', () => expect(() => refreshTokenSchema.parse({ refreshToken: '' })).toThrow());
});

describe('resendVerificationSchema', () => {
  it('accepts valid email', () => expect(() => resendVerificationSchema.parse({ email: 'a@b.com' })).not.toThrow());
  it('rejects invalid email', () => expect(() => resendVerificationSchema.parse({ email: 'bad' })).toThrow());
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => expect(() => forgotPasswordSchema.parse({ email: 'a@b.com' })).not.toThrow());
  it('rejects missing email', () => expect(() => forgotPasswordSchema.parse({})).toThrow());
});

describe('resetPasswordSchema', () => {
  it('accepts valid token+password', () => expect(() => resetPasswordSchema.parse({ token: 'abc', password: 'NewPass1' })).not.toThrow());
  it('rejects empty token', () => expect(() => resetPasswordSchema.parse({ token: '', password: 'NewPass1' })).toThrow());
  it('rejects weak password', () => expect(() => resetPasswordSchema.parse({ token: 'abc', password: 'weak' })).toThrow());
});

describe('logoutSchema', () => {
  it('accepts non-empty token', () => expect(() => logoutSchema.parse({ refreshToken: 'tok' })).not.toThrow());
  it('rejects empty token', () => expect(() => logoutSchema.parse({ refreshToken: '' })).toThrow());
});
