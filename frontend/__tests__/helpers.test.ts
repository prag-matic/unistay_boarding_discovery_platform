import {
  formatCurrency,
  timeAgo,
  getInitials,
  formatCountdown,
  getErrorMessage,
} from '../utils/helpers';

describe('formatCurrency', () => {
  it('formats amount with default LKR currency', () => {
    expect(formatCurrency(50000)).toBe('LKR 50,000');
  });

  it('formats amount with custom currency', () => {
    expect(formatCurrency(1000, 'USD')).toBe('USD 1,000');
  });

  it('formats zero amount', () => {
    expect(formatCurrency(0)).toBe('LKR 0');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1000000)).toBe('LKR 1,000,000');
  });

  it('formats fractional amounts', () => {
    expect(formatCurrency(1500.5)).toMatch(/LKR 1,500/);
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for less than 60 seconds ago', () => {
    const date = new Date('2024-01-15T11:59:30Z').toISOString();
    expect(timeAgo(date)).toBe('just now');
  });

  it('returns minutes ago for less than an hour', () => {
    const date = new Date('2024-01-15T11:45:00Z').toISOString();
    expect(timeAgo(date)).toBe('15m ago');
  });

  it('returns hours ago for less than a day', () => {
    const date = new Date('2024-01-15T09:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('3h ago');
  });

  it('returns days ago for less than a week', () => {
    const date = new Date('2024-01-12T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('3d ago');
  });

  it('returns formatted date for more than a week ago', () => {
    const date = new Date('2024-01-01T12:00:00Z').toISOString();
    const result = timeAgo(date);
    expect(result).not.toMatch(/ago$/);
    expect(result).not.toBe('just now');
  });

  it('returns "just now" for exactly 0 seconds ago', () => {
    const date = new Date('2024-01-15T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('just now');
  });
});

describe('getInitials', () => {
  it('returns uppercased first letters of first and last name', () => {
    expect(getInitials('john', 'doe')).toBe('JD');
  });

  it('handles already uppercase names', () => {
    expect(getInitials('Alice', 'Smith')).toBe('AS');
  });

  it('handles single character names', () => {
    expect(getInitials('A', 'B')).toBe('AB');
  });

  it('handles mixed case names', () => {
    expect(getInitials('bob', 'JONES')).toBe('BJ');
  });
});

describe('formatCountdown', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('formats 59 seconds correctly', () => {
    expect(formatCountdown(59)).toBe('00:59');
  });

  it('formats exactly 60 seconds as 01:00', () => {
    expect(formatCountdown(60)).toBe('01:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatCountdown(90)).toBe('01:30');
  });

  it('formats large values correctly', () => {
    expect(formatCountdown(3661)).toBe('61:01');
  });

  it('pads single digit minutes and seconds with zeros', () => {
    expect(formatCountdown(65)).toBe('01:05');
  });
});

describe('getErrorMessage', () => {
  it('returns joined detail messages from axios error with details', () => {
    const error = {
      response: {
        data: {
          details: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' },
          ],
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Invalid email\nToo short');
  });

  it('returns message from axios error without details', () => {
    const error = {
      response: {
        data: {
          message: 'Unauthorized',
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Unauthorized');
  });

  it('returns default message when axios response data has no message or details', () => {
    const error = { response: { data: {} } };
    expect(getErrorMessage(error)).toBe('An error occurred');
  });

  it('returns Error message for Error instances', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('returns fallback message for unknown error types', () => {
    expect(getErrorMessage('string error')).toBe('An unexpected error occurred');
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });

  it('returns "An error occurred" when details array is empty', () => {
    const error = {
      response: {
        data: {
          message: 'Some error',
          details: [],
        },
      },
    };
    expect(getErrorMessage(error)).toBe('Some error');
  });
});
