import { describe, it, expect } from 'vitest';
import { createVisitRequestSchema, rejectVisitRequestSchema } from '@/schemas/visitRequest.validators.js';

const valid = { boardingId: 'b-1', requestedStartAt: '2025-04-01T09:00:00', requestedEndAt: '2025-04-01T10:00:00' };

describe('createVisitRequestSchema', () => {
  it('accepts valid data', () => expect(() => createVisitRequestSchema.parse(valid)).not.toThrow());
  it('accepts ISO 8601 with timezone offset', () => expect(() => createVisitRequestSchema.parse({ ...valid, requestedStartAt: '2025-04-01T09:00:00+05:30', requestedEndAt: '2025-04-01T10:00:00+05:30' })).not.toThrow());
  it('rejects empty boardingId', () => expect(() => createVisitRequestSchema.parse({ ...valid, boardingId: '' })).toThrow());
  it('rejects malformed requestedStartAt', () => expect(() => createVisitRequestSchema.parse({ ...valid, requestedStartAt: 'not-a-date' })).toThrow());
  it('rejects malformed requestedEndAt', () => expect(() => createVisitRequestSchema.parse({ ...valid, requestedEndAt: '01/04/2025' })).toThrow());
  it('accepts optional message', () => expect(createVisitRequestSchema.parse({ ...valid, message: 'hi' }).message).toBe('hi'));
  it('rejects message > 1000 chars', () => expect(() => createVisitRequestSchema.parse({ ...valid, message: 'a'.repeat(1001) })).toThrow());
});

describe('rejectVisitRequestSchema', () => {
  it('accepts non-empty reason', () => expect(() => rejectVisitRequestSchema.parse({ reason: 'Unavail' })).not.toThrow());
  it('rejects empty reason', () => expect(() => rejectVisitRequestSchema.parse({ reason: '' })).toThrow());
  it('rejects missing reason', () => expect(() => rejectVisitRequestSchema.parse({})).toThrow());
});
