/**
 * Tests for lib/payment.ts
 * The axios instance (lib/api) is mocked so no real HTTP calls are made.
 */

jest.mock('../lib/api');

import api from '../lib/api';
import {
  createPayment,
  getMyPayments,
  getPaymentById,
  getBoardingPayments,
  confirmPayment,
  rejectPayment,
} from '../lib/payment';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

const okEnvelope = (data: unknown) => ({
  data: { success: true, message: 'ok', data },
});

beforeEach(() => jest.clearAllMocks());

// ─── createPayment ──────────────────────────────────────────────────────────

describe('createPayment', () => {
  it('calls POST /payments with payload', async () => {
    const payload = {
      studentId: 's1',
      rentalPeriodId: 'rp1',
      reservationId: 'r1',
      amount: 15000,
      paymentMethod: 'CASH' as const,
      paidAt: '2024-01-15T10:00:00Z',
    };
    mockPost.mockResolvedValueOnce(okEnvelope({ payment: { id: 'p1' } }));
    const result = await createPayment(payload);
    expect(mockPost).toHaveBeenCalledWith('/payments', payload);
    expect(result.data.payment.id).toBe('p1');
  });

  it('includes optional referenceNumber when provided', async () => {
    const payload = {
      studentId: 's1',
      rentalPeriodId: 'rp1',
      reservationId: 'r1',
      amount: 10000,
      paymentMethod: 'BANK_TRANSFER' as const,
      paidAt: '2024-01-15T10:00:00Z',
      referenceNumber: 'REF123',
    };
    mockPost.mockResolvedValueOnce(okEnvelope({ payment: { id: 'p2' } }));
    await createPayment(payload);
    const sentPayload = mockPost.mock.calls[0][1];
    expect(sentPayload.referenceNumber).toBe('REF123');
  });
});

// ─── getMyPayments ──────────────────────────────────────────────────────────

describe('getMyPayments', () => {
  it('calls GET /payments/my-payments', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ payments: [] }));
    const result = await getMyPayments();
    expect(mockGet).toHaveBeenCalledWith('/payments/my-payments');
    expect(result.data.payments).toEqual([]);
  });
});

// ─── getPaymentById ─────────────────────────────────────────────────────────

describe('getPaymentById', () => {
  it('calls GET /payments/:id', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ payment: { id: 'p1' } }));
    const result = await getPaymentById('p1');
    expect(mockGet).toHaveBeenCalledWith('/payments/p1');
    expect(result.data.payment.id).toBe('p1');
  });
});

// ─── getBoardingPayments ─────────────────────────────────────────────────────

describe('getBoardingPayments', () => {
  it('calls GET /payments/my-boardings', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ payments: [] }));
    await getBoardingPayments();
    expect(mockGet).toHaveBeenCalledWith('/payments/my-boardings');
  });
});

// ─── confirmPayment ──────────────────────────────────────────────────────────

describe('confirmPayment', () => {
  it('calls PATCH /payments/:id/confirm', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ payment: { id: 'p1' } }));
    await confirmPayment('p1');
    expect(mockPatch).toHaveBeenCalledWith('/payments/p1/confirm');
  });
});

// ─── rejectPayment ───────────────────────────────────────────────────────────

describe('rejectPayment', () => {
  it('calls PATCH /payments/:id/reject with reason', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ payment: { id: 'p1' } }));
    await rejectPayment('p1', { reason: 'Invalid proof' });
    expect(mockPatch).toHaveBeenCalledWith('/payments/p1/reject', { reason: 'Invalid proof' });
  });
});
