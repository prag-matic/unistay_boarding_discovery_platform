/**
 * Tests for lib/reservation.ts
 * The axios instance (lib/api) is mocked so no real HTTP calls are made.
 */

jest.mock('../lib/api');

import api from '../lib/api';
import {
  createReservation,
  getMyReservations,
  getReceivedReservations,
  getReservationById,
  getRentalPeriods,
  approveReservation,
  rejectReservation,
  cancelReservation,
  completeReservation,
} from '../lib/reservation';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

const okEnvelope = (data: unknown) => ({
  data: { success: true, message: 'ok', data },
});

beforeEach(() => jest.clearAllMocks());

describe('createReservation', () => {
  it('calls POST /reservation with payload', async () => {
    const payload = { boardingId: 'b1', moveInDate: '2024-02-01' };
    mockPost.mockResolvedValueOnce(okEnvelope({ reservation: { id: 'res1' } }));
    const result = await createReservation(payload);
    expect(mockPost).toHaveBeenCalledWith('/reservation', payload);
    expect(result.data.reservation.id).toBe('res1');
  });
});

describe('getMyReservations', () => {
  it('calls GET /reservation/my-requests', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reservations: [] }));
    await getMyReservations();
    expect(mockGet).toHaveBeenCalledWith('/reservation/my-requests');
  });
});

describe('getReceivedReservations', () => {
  it('calls GET /reservation/my-boardings', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reservations: [] }));
    await getReceivedReservations();
    expect(mockGet).toHaveBeenCalledWith('/reservation/my-boardings');
  });
});

describe('getReservationById', () => {
  it('calls GET /reservation/:id', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reservation: { id: 'res1' } }));
    const result = await getReservationById('res1');
    expect(mockGet).toHaveBeenCalledWith('/reservation/res1');
    expect(result.data.reservation.id).toBe('res1');
  });
});

describe('getRentalPeriods', () => {
  it('calls GET /reservation/:id/rental-periods', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ rentalPeriods: [] }));
    await getRentalPeriods('res1');
    expect(mockGet).toHaveBeenCalledWith('/reservation/res1/rental-periods');
  });
});

describe('approveReservation', () => {
  it('calls PATCH /reservation/:id/approve', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ reservation: {} }));
    await approveReservation('res1');
    expect(mockPatch).toHaveBeenCalledWith('/reservation/res1/approve');
  });
});

describe('rejectReservation', () => {
  it('calls PATCH /reservation/:id/reject with reason', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ reservation: {} }));
    await rejectReservation('res1', { reason: 'Not available' });
    expect(mockPatch).toHaveBeenCalledWith('/reservation/res1/reject', { reason: 'Not available' });
  });
});

describe('cancelReservation', () => {
  it('calls PATCH /reservation/:id/cancel', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ reservation: {} }));
    await cancelReservation('res1');
    expect(mockPatch).toHaveBeenCalledWith('/reservation/res1/cancel');
  });
});

describe('completeReservation', () => {
  it('calls PATCH /reservation/:id/complete', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ reservation: {} }));
    await completeReservation('res1');
    expect(mockPatch).toHaveBeenCalledWith('/reservation/res1/complete');
  });
});
