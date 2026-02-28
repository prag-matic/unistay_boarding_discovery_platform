export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class UserAlreadyExistsError extends AppError {
    constructor(message = 'A user with this email already Exists') {
        super(message, 409);
    }
}

export class InvalidCredentialError extends AppError {
    constructor(message = 'Invalid email or password') {
        super(message, 404);
    }
}

export class InvalidPasswordError extends AppError {
    constructor(message = 'Invalid email or password') {
        super(message, 401);
    }
}

export class AccountDeactivatedError extends AppError {
  constructor(message = 'Account has been deactivated') {
    super(message, 403);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 410);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 422);
    this.details = details;
  }
}

export class BoardingNotFoundError extends AppError {
  constructor(message = 'Boarding not found') {
    super(message, 404);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message = 'Invalid state transition') {
    super(message, 422);
  }
}

export class SlugConflictError extends AppError {
  constructor(message = 'Slug already exists') {
    super(message, 409);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Resource is gone') {
    super(message, 410);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}
