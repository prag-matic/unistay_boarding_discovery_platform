import { describe, it, expect } from 'vitest';
import {
  AppError,
  UserNotFoundError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  InvalidPasswordError,
  AccountDeactivatedError,
  TokenExpiredError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  BoardingNotFoundError,
  InvalidStateTransitionError,
  SlugConflictError,
  GoneError,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '@/errors/AppError.js';

describe('AppError', () => {
  it('sets message, statusCode, and isOperational', () => {
    const err = new AppError('test', 400);
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.isOperational).toBe(true);
  });

  it('respects custom isOperational=false', () => {
    const err = new AppError('crash', 500, false);
    expect(err.isOperational).toBe(false);
  });

  it('is an instance of Error and AppError', () => {
    const err = new AppError('x', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('UserNotFoundError', () => {
  it('has 404 and default message', () => {
    const e = new UserNotFoundError();
    expect(e.statusCode).toBe(404);
    expect(e.message).toBe('User Not Found');
  });
  it('accepts custom message', () => {
    expect(new UserNotFoundError('gone').message).toBe('gone');
  });
});

describe('UserAlreadyExistsError', () => {
  it('has 409', () => expect(new UserAlreadyExistsError().statusCode).toBe(409));
});

describe('InvalidCredentialsError', () => {
  it('has 404', () => expect(new InvalidCredentialsError().statusCode).toBe(404));
});

describe('InvalidPasswordError', () => {
  it('has 401', () => expect(new InvalidPasswordError().statusCode).toBe(401));
});

describe('AccountDeactivatedError', () => {
  it('has 403', () => {
    const e = new AccountDeactivatedError();
    expect(e.statusCode).toBe(403);
    expect(e.message).toBe('Account has been deactivated');
  });
});

describe('TokenExpiredError', () => {
  it('has 410 and default message', () => {
    const e = new TokenExpiredError();
    expect(e.statusCode).toBe(410);
    expect(e.message).toBe('Token has expired');
  });
  it('accepts custom message', () => {
    expect(new TokenExpiredError('Missing').message).toBe('Missing');
  });
});

describe('UnauthorizedError', () => {
  it('has 401', () => expect(new UnauthorizedError().statusCode).toBe(401));
});

describe('ForbiddenError', () => {
  it('has 403', () => expect(new ForbiddenError().statusCode).toBe(403));
});

describe('ValidationError', () => {
  it('has 422 and stores details', () => {
    const details = [{ field: 'email', message: 'required' }];
    const e = new ValidationError('Bad', details);
    expect(e.statusCode).toBe(422);
    expect(e.details).toEqual(details);
  });
  it('details is undefined by default', () => {
    expect(new ValidationError().details).toBeUndefined();
  });
});

describe('BoardingNotFoundError', () => {
  it('has 404', () => expect(new BoardingNotFoundError().statusCode).toBe(404));
});

describe('InvalidStateTransitionError', () => {
  it('has 422', () => expect(new InvalidStateTransitionError().statusCode).toBe(422));
});

describe('SlugConflictError', () => {
  it('has 409', () => expect(new SlugConflictError().statusCode).toBe(409));
});

describe('GoneError', () => {
  it('has 410', () => expect(new GoneError().statusCode).toBe(410));
});

describe('NotFoundError', () => {
  it('default resource name', () => expect(new NotFoundError().message).toBe('Resource not found'));
  it('custom resource name', () => expect(new NotFoundError('Boarding').message).toBe('Boarding not found'));
});

describe('BadRequestError', () => {
  it('has 400', () => expect(new BadRequestError().statusCode).toBe(400));
  it('accepts custom message', () => expect(new BadRequestError('oops').message).toBe('oops'));
});

describe('ConflictError', () => {
  it('has 409', () => expect(new ConflictError().statusCode).toBe(409));
});
