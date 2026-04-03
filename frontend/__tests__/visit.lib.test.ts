/**
 * Tests for lib/visit.ts
 * The axios instance (lib/api) is mocked so no real HTTP calls are made.
 */

jest.mock('../lib/api');

import api from '../lib/api';
import {
  createVisitRequest,
  getMyVisitRequests,
  getReceivedVisitRequests,
  approveVisitRequest,
  rejectVisitRequest,
  cancelVisitRequest,
} from '../lib/visit';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPatch = api.patch as jest.Mock;

const okEnvelope = (data: unknown) => ({
  data: { success: true, message: 'ok', data },
});

beforeEach(() => jest.clearAllMocks());

describe('createVisitRequest', () => {
  it('calls POST /visit-requests with payload', async () => {
    const payload = {
      boardingId: 'b1',
      requestedStartAt: '2024-02-10T09:00:00Z',
      requestedEndAt: '2024-02-10T10:00:00Z',
    };
    mockPost.mockResolvedValueOnce(okEnvelope({ visitRequest: { id: 'v1' } }));
    const result = await createVisitRequest(payload);
    expect(mockPost).toHaveBeenCalledWith('/visit-requests', payload);
    expect(result.data.visitRequest.id).toBe('v1');
  });

  it('includes optional message when provided', async () => {
    const payload = {
      boardingId: 'b1',
      requestedStartAt: '2024-02-10T09:00:00Z',
      requestedEndAt: '2024-02-10T10:00:00Z',
      message: 'Please confirm',
    };
    mockPost.mockResolvedValueOnce(okEnvelope({ visitRequest: { id: 'v2' } }));
    await createVisitRequest(payload);
    expect(mockPost.mock.calls[0][1].message).toBe('Please confirm');
  });
});

describe('getMyVisitRequests', () => {
  it('calls GET /visit-requests/my-requests', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ visitRequests: [] }));
    await getMyVisitRequests();
    expect(mockGet).toHaveBeenCalledWith('/visit-requests/my-requests');
  });
});

describe('getReceivedVisitRequests', () => {
  it('calls GET /visit-requests/my-boardings', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ visitRequests: [] }));
    await getReceivedVisitRequests();
    expect(mockGet).toHaveBeenCalledWith('/visit-requests/my-boardings');
  });
});

describe('approveVisitRequest', () => {
  it('calls PATCH /visit-requests/:id/approve', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ visitRequest: {} }));
    await approveVisitRequest('v1');
    expect(mockPatch).toHaveBeenCalledWith('/visit-requests/v1/approve');
  });
});

describe('rejectVisitRequest', () => {
  it('calls PATCH /visit-requests/:id/reject with reason', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ visitRequest: {} }));
    await rejectVisitRequest('v1', { reason: 'Fully booked' });
    expect(mockPatch).toHaveBeenCalledWith('/visit-requests/v1/reject', { reason: 'Fully booked' });
  });
});

describe('cancelVisitRequest', () => {
  it('calls PATCH /visit-requests/:id/cancel', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ visitRequest: {} }));
    await cancelVisitRequest('v1');
    expect(mockPatch).toHaveBeenCalledWith('/visit-requests/v1/cancel');
  });
});
