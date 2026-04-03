import { getPasswordStrength } from '../utils/password';

describe('getPasswordStrength', () => {
  describe('score calculation', () => {
    it('returns score 0 for empty password', () => {
      const result = getPasswordStrength('');
      expect(result.score).toBe(0);
    });

    it('returns score 0 for very weak password (letters only, short)', () => {
      const result = getPasswordStrength('abc');
      expect(result.score).toBe(0);
    });

    it('returns score 1 for password with only lowercase and length >= 8', () => {
      const result = getPasswordStrength('abcdefgh');
      // score criteria: length>=8(+1), uppercase(0), lowercase(+1), number(0), special(0) = 2/5 -> floor(2/5*4)=1
      expect(result.score).toBe(1);
    });

    it('returns score 2 for password with lowercase, uppercase, and length >= 8', () => {
      const result = getPasswordStrength('Abcdefgh');
      // length>=8(+1), uppercase(+1), lowercase(+1) = 3/5 -> floor(3/5*4)=2
      expect(result.score).toBe(2);
    });

    it('returns score 3 for password with lowercase, uppercase, number, length >= 8', () => {
      const result = getPasswordStrength('Abcdefg1');
      // length>=8(+1), uppercase(+1), lowercase(+1), number(+1) = 4/5 -> floor(4/5*4)=3
      expect(result.score).toBe(3);
    });

    it('returns score 4 for fully strong password', () => {
      const result = getPasswordStrength('Abcdef1!');
      // length>=8(+1), uppercase(+1), lowercase(+1), number(+1), special(+1) = 5/5 -> min(4, floor(5/5*4))=4
      expect(result.score).toBe(4);
    });

    it('caps score at 4', () => {
      const result = getPasswordStrength('ABCDef12!@#$');
      expect(result.score).toBeLessThanOrEqual(4);
    });
  });

  describe('labels', () => {
    it('returns "Weak" label for score 0', () => {
      const result = getPasswordStrength('');
      expect(result.label).toBe('Weak');
    });

    it('returns "Weak" label for score 1', () => {
      const result = getPasswordStrength('abcdefgh');
      expect(result.label).toBe('Weak');
    });

    it('returns "Strong" label for a fully strong password', () => {
      const result = getPasswordStrength('Abcdef1!');
      expect(result.label).toBe('Strong');
    });
  });

  describe('colors', () => {
    it('returns red color for weak password', () => {
      const result = getPasswordStrength('');
      expect(result.color).toBe('#EF4444');
    });

    it('returns green color for strong password', () => {
      const result = getPasswordStrength('Abcdef1!');
      expect(result.color).toBe('#22C55E');
    });
  });

  describe('requirements', () => {
    it('returns 3 requirement entries', () => {
      const result = getPasswordStrength('');
      expect(result.requirements).toHaveLength(3);
    });

    it('marks length requirement as met when password >= 8 chars', () => {
      const result = getPasswordStrength('abcdefgh');
      const lengthReq = result.requirements.find((r) => r.label === 'At least 8 characters');
      expect(lengthReq?.met).toBe(true);
    });

    it('marks length requirement as unmet when password < 8 chars', () => {
      const result = getPasswordStrength('abc');
      const lengthReq = result.requirements.find((r) => r.label === 'At least 8 characters');
      expect(lengthReq?.met).toBe(false);
    });

    it('marks number requirement as met when password contains a digit', () => {
      const result = getPasswordStrength('abc1defg');
      const numReq = result.requirements.find((r) => r.label === 'One number (0-9)');
      expect(numReq?.met).toBe(true);
    });

    it('marks number requirement as unmet when password has no digits', () => {
      const result = getPasswordStrength('abcdefgh');
      const numReq = result.requirements.find((r) => r.label === 'One number (0-9)');
      expect(numReq?.met).toBe(false);
    });

    it('marks special character requirement as met when password has special char', () => {
      const result = getPasswordStrength('abc!defg');
      const specialReq = result.requirements.find((r) =>
        r.label.startsWith('One special character')
      );
      expect(specialReq?.met).toBe(true);
    });

    it('marks special character requirement as unmet when password has no special char', () => {
      const result = getPasswordStrength('abcdefgh');
      const specialReq = result.requirements.find((r) =>
        r.label.startsWith('One special character')
      );
      expect(specialReq?.met).toBe(false);
    });
  });
});
