import type { Response } from 'express';

// interface for typescript
export interface SuccessResponse<T = unknown> {
    success: true;
    message: string;
    data: T;
    timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
): Response {

    const body: SuccessResponse<T> = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  error: string,
  message: string,
  statusCode = 500,
  details?: unknown,
): Response {
  const body: ErrorResponse = {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
    ...(details !== undefined && { details }),
  };
  return res.status(statusCode).json(body);
}
