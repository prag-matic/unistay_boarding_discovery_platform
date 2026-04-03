import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '@/middleware/errorHandler.js';
import { AppError, ValidationError, UnauthorizedError } from '@/errors/AppError.js';
import mongoose from 'mongoose';
import { ZodError, z } from 'zod';
import type { Request, Response } from 'express';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}
function getBody(res: Response) {
  return (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
}
const req = {} as Request;

describe('errorHandler', () => {
  it('handles ZodError with 422', () => {
    let zodErr!: ZodError;
    try { z.object({ email: z.string().email() }).parse({ email: 'bad' }); } catch (e) { zodErr = e as ZodError; }
    const res = mockRes();
    errorHandler(zodErr, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(getBody(res).error).toBe('ValidationError');
    expect(Array.isArray(getBody(res).details)).toBe(true);
  });

  it('handles JsonWebTokenError with 401', () => {
    const err = Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' });
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getBody(res).error).toBe('UnauthorizedError');
  });

  it('handles TokenExpiredError (JWT) with 401', () => {
    const err = Object.assign(new Error('expired'), { name: 'TokenExpiredError' });
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getBody(res).error).toBe('TokenExpiredError');
  });

  it('handles Mongoose validation errors with 422', () => {
    const err = new mongoose.Error.ValidationError();
    err.addError('email', new mongoose.Error.ValidatorError({ path: 'email', message: 'Invalid email', value: 'bad' }));
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(getBody(res).error).toBe('ValidationError');
  });

  it('handles CastError with 400', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'bad-id', 'boardingId');
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(getBody(res).error).toBe('BadRequestError');
  });

  it('handles duplicate key errors with 409', () => {
    const err = Object.assign(new Error('duplicate key'), { code: 11000, keyValue: { email: 'a@b.com' } });
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(getBody(res).error).toBe('ConflictError');
  });

  it('handles generic mongoose errors with 500', () => {
    const err = new mongoose.Error('db failed');
    const res = mockRes();
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(getBody(res).error).toBe('DatabaseError');
  });

  it('handles AppError with correct status', () => {
    const res = mockRes();
    errorHandler(new UnauthorizedError('Not logged in'), req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getBody(res).message).toBe('Not logged in');
  });

  it('handles ValidationError (AppError subclass) with details', () => {
    const details = [{ field: 'name', message: 'required' }];
    const res = mockRes();
    errorHandler(new ValidationError('Bad', details), req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(getBody(res).details).toEqual(details);
  });

  it('falls back to 500 for unexpected errors', () => {
    const res = mockRes();
    errorHandler(new Error('unexpected'), req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(getBody(res).error).toBe('InternalServerError');
  });
});
