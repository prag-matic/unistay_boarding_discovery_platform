import {
  loginSchema,
  studentRegisterSchema,
  ownerRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  editProfileSchema,
} from '../utils/validation';

// Helper: check that parse succeeds
function expectValid(schema: { safeParse: (v: unknown) => { success: boolean } }, data: unknown) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(true);
}

// Helper: check that parse fails and the given path contains an error
function expectError(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: Array<{ path: unknown[]; message: string }> } } },
  data: unknown,
  path?: string
) {
  const result = schema.safeParse(data);
  expect(result.success).toBe(false);
  if (path && result.error) {
    const pathExists = result.error.issues.some((issue) =>
      issue.path.includes(path)
    );
    expect(pathExists).toBe(true);
  }
}

// ─── loginSchema ──────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    expectValid(loginSchema, { email: 'user@example.com', password: 'secret' });
  });

  it('rejects missing email', () => {
    expectError(loginSchema, { password: 'secret' }, 'email');
  });

  it('rejects invalid email format', () => {
    expectError(loginSchema, { email: 'not-an-email', password: 'secret' }, 'email');
  });

  it('rejects empty password', () => {
    expectError(loginSchema, { email: 'user@example.com', password: '' }, 'password');
  });

  it('rejects missing password', () => {
    expectError(loginSchema, { email: 'user@example.com' }, 'password');
  });
});

// ─── studentRegisterSchema ────────────────────────────────────────────────────

describe('studentRegisterSchema', () => {
  const valid = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    university: 'UniA',
    password: 'Password1',
    confirmPassword: 'Password1',
    terms: true as const,
  };

  it('accepts valid student registration data', () => {
    expectValid(studentRegisterSchema, valid);
  });

  it('rejects missing firstName', () => {
    expectError(studentRegisterSchema, { ...valid, firstName: '' }, 'firstName');
  });

  it('rejects missing lastName', () => {
    expectError(studentRegisterSchema, { ...valid, lastName: '' }, 'lastName');
  });

  it('rejects invalid email', () => {
    expectError(studentRegisterSchema, { ...valid, email: 'bad' }, 'email');
  });

  it('rejects missing university', () => {
    expectError(studentRegisterSchema, { ...valid, university: '' }, 'university');
  });

  it('rejects password shorter than 8 characters', () => {
    expectError(studentRegisterSchema, { ...valid, password: 'Pa1', confirmPassword: 'Pa1' }, 'password');
  });

  it('rejects password without uppercase letter', () => {
    expectError(studentRegisterSchema, { ...valid, password: 'password1', confirmPassword: 'password1' }, 'password');
  });

  it('rejects password without a number', () => {
    expectError(studentRegisterSchema, { ...valid, password: 'Passwordd', confirmPassword: 'Passwordd' }, 'password');
  });

  it('rejects mismatched passwords', () => {
    expectError(studentRegisterSchema, { ...valid, confirmPassword: 'Different1' }, 'confirmPassword');
  });

  it('rejects when terms is not accepted', () => {
    expectError(studentRegisterSchema, { ...valid, terms: false as unknown as true }, 'terms');
  });
});

// ─── ownerRegisterSchema ──────────────────────────────────────────────────────

describe('ownerRegisterSchema', () => {
  const valid = {
    firstName: 'Bob',
    lastName: 'Owner',
    email: 'bob@example.com',
    phone: '0712345678',
    password: 'Password1',
    confirmPassword: 'Password1',
    terms: true as const,
  };

  it('accepts valid owner registration data', () => {
    expectValid(ownerRegisterSchema, valid);
  });

  it('accepts optional nicNumber', () => {
    expectValid(ownerRegisterSchema, { ...valid, nicNumber: '123456789V' });
  });

  it('rejects missing phone', () => {
    expectError(ownerRegisterSchema, { ...valid, phone: '' }, 'phone');
  });

  it('rejects phone shorter than 7 characters', () => {
    expectError(ownerRegisterSchema, { ...valid, phone: '071' }, 'phone');
  });

  it('rejects invalid email', () => {
    expectError(ownerRegisterSchema, { ...valid, email: 'not-email' }, 'email');
  });

  it('rejects mismatched passwords', () => {
    expectError(ownerRegisterSchema, { ...valid, confirmPassword: 'Mismatch1' }, 'confirmPassword');
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expectValid(forgotPasswordSchema, { email: 'test@example.com' });
  });

  it('rejects invalid email', () => {
    expectError(forgotPasswordSchema, { email: 'not-valid' }, 'email');
  });

  it('rejects empty email', () => {
    expectError(forgotPasswordSchema, { email: '' }, 'email');
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  const valid = { password: 'Password1', confirmPassword: 'Password1' };

  it('accepts valid matching passwords', () => {
    expectValid(resetPasswordSchema, valid);
  });

  it('rejects weak password', () => {
    expectError(resetPasswordSchema, { password: 'weak', confirmPassword: 'weak' }, 'password');
  });

  it('rejects mismatched passwords', () => {
    expectError(resetPasswordSchema, { ...valid, confirmPassword: 'Mismatch1' }, 'confirmPassword');
  });
});

// ─── changePasswordSchema ─────────────────────────────────────────────────────

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'OldPass1',
    newPassword: 'NewPass1',
    confirmPassword: 'NewPass1',
  };

  it('accepts valid change password data', () => {
    expectValid(changePasswordSchema, valid);
  });

  it('rejects empty currentPassword', () => {
    expectError(changePasswordSchema, { ...valid, currentPassword: '' }, 'currentPassword');
  });

  it('rejects weak newPassword', () => {
    expectError(changePasswordSchema, { ...valid, newPassword: 'weak', confirmPassword: 'weak' }, 'newPassword');
  });

  it('rejects mismatched confirm password', () => {
    expectError(changePasswordSchema, { ...valid, confirmPassword: 'Mismatch1' }, 'confirmPassword');
  });
});

// ─── editProfileSchema ────────────────────────────────────────────────────────

describe('editProfileSchema', () => {
  it('accepts required fields only', () => {
    expectValid(editProfileSchema, { firstName: 'Alice', lastName: 'Wonder' });
  });

  it('accepts optional fields', () => {
    expectValid(editProfileSchema, {
      firstName: 'Alice',
      lastName: 'Wonder',
      phone: '0712345678',
      university: 'UniB',
      nicNumber: '123456789V',
    });
  });

  it('rejects empty firstName', () => {
    expectError(editProfileSchema, { firstName: '', lastName: 'Wonder' }, 'firstName');
  });

  it('rejects empty lastName', () => {
    expectError(editProfileSchema, { firstName: 'Alice', lastName: '' }, 'lastName');
  });

  it('rejects missing firstName', () => {
    expectError(editProfileSchema, { lastName: 'Wonder' }, 'firstName');
  });
});
