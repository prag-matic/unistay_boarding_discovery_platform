import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError } from '@/lib/response.js';
import type { Response } from 'express';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}
function body(res: Response) {
  return (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe('sendSuccess', () => {
  it('sends 200 with success payload by default', () => {
    const res = mockRes();
    sendSuccess(res, { id: '1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body(res).success).toBe(true);
    expect(body(res).data).toEqual({ id: '1' });
  });

  it('uses custom message and status code', () => {
    const res = mockRes();
    sendSuccess(res, null, 'Created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(body(res).message).toBe('Created');
  });

  it('includes a valid ISO timestamp', () => {
    const res = mockRes();
    sendSuccess(res, {});
    expect(() => new Date(body(res).timestamp).toISOString()).not.toThrow();
  });
});

describe('sendError', () => {
  it('sends 500 by default', () => {
    const res = mockRes();
    sendError(res, 'InternalServerError', 'oops');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(body(res).success).toBe(false);
  });

  it('uses provided status code', () => {
    const res = mockRes();
    sendError(res, 'NotFound', 'not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('includes details when provided', () => {
    const res = mockRes();
    const details = [{ field: 'email' }];
    sendError(res, 'ValidationError', 'fail', 422, details);
    expect(body(res).details).toEqual(details);
  });

  it('omits details key when not provided', () => {
    const res = mockRes();
    sendError(res, 'E', 'msg', 400);
    expect('details' in body(res)).toBe(false);
  });
});
