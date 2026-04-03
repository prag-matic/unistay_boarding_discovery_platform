/**
 * Tests for lib/boarding.ts
 * The axios instance (lib/api) is mocked so no real HTTP calls are made.
 */

jest.mock('../lib/api');

import api from '../lib/api';
import {
  searchBoardings,
  getBoardingBySlug,
  getMyListings,
  createBoarding,
  updateBoarding,
  submitBoardingForApproval,
  deactivateBoarding,
  activateBoarding,
  deleteBoardingImage,
  getBoardingReviews,
} from '../lib/boarding';

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockPut = api.put as jest.Mock;
const mockPatch = api.patch as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const okEnvelope = (data: unknown) => ({
  data: { success: true, message: 'ok', data },
});

beforeEach(() => jest.clearAllMocks());

// ─── searchBoardings ────────────────────────────────────────────────────────

describe('searchBoardings', () => {
  it('calls GET /boardings with no params when called with defaults', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boarding: [], pagination: {} }));
    const result = await searchBoardings();
    expect(mockGet).toHaveBeenCalledWith('/boardings', { params: {} });
    expect(result).toEqual({ success: true, message: 'ok', data: { boarding: [], pagination: {} } });
  });

  it('builds query string from provided params', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boarding: [], pagination: {} }));
    await searchBoardings({ city: 'Colombo', minRent: 5000, page: 2, size: 10 });
    const call = mockGet.mock.calls[0];
    expect(call[1].params).toMatchObject({ city: 'Colombo', minRent: '5000', page: '2', size: '10' });
  });

  it('joins amenities array with comma', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boarding: [], pagination: {} }));
    await searchBoardings({ amenities: ['WIFI', 'PARKING'] });
    const params = mockGet.mock.calls[0][1].params;
    expect(params.amenities).toBe('WIFI,PARKING');
  });

  it('omits undefined optional params', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boarding: [], pagination: {} }));
    await searchBoardings({ city: 'Kandy' });
    const params = mockGet.mock.calls[0][1].params;
    expect(Object.keys(params)).not.toContain('minRent');
    expect(Object.keys(params)).not.toContain('maxRent');
  });
});

// ─── getBoardingBySlug ──────────────────────────────────────────────────────

describe('getBoardingBySlug', () => {
  it('calls GET /boardings/:slug', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boarding: { id: '1', slug: 'my-place' } }));
    const result = await getBoardingBySlug('my-place');
    expect(mockGet).toHaveBeenCalledWith('/boardings/my-place');
    expect(result.data.boarding.slug).toBe('my-place');
  });
});

// ─── getMyListings ──────────────────────────────────────────────────────────

describe('getMyListings', () => {
  it('calls GET /boardings/my-listings', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ boardings: [] }));
    await getMyListings();
    expect(mockGet).toHaveBeenCalledWith('/boardings/my-listings');
  });
});

// ─── createBoarding ─────────────────────────────────────────────────────────

describe('createBoarding', () => {
  it('calls POST /boardings with payload', async () => {
    const payload = {
      title: 'Test Boarding House',
      description: 'A nice place to stay near the university',
      city: 'Colombo',
      district: 'Colombo',
      monthlyRent: 15000,
      boardingType: 'FULL_BOARD' as const,
      genderPref: 'ANY' as const,
      latitude: 6.9,
      longitude: 79.8,
      maxOccupants: 5,
    };
    mockPost.mockResolvedValueOnce(okEnvelope({ boarding: { id: 'b1', ...payload } }));
    const result = await createBoarding(payload);
    expect(mockPost).toHaveBeenCalledWith('/boardings', payload);
    expect(result.data.boarding.city).toBe('Colombo');
  });
});

// ─── updateBoarding ─────────────────────────────────────────────────────────

describe('updateBoarding', () => {
  it('calls PUT /boardings/:id with merged id in body', async () => {
    mockPut.mockResolvedValueOnce(okEnvelope({ boarding: { id: 'b1' } }));
    await updateBoarding('b1', { title: 'Updated Title' });
    expect(mockPut).toHaveBeenCalledWith('/boardings/b1', { title: 'Updated Title', id: 'b1' });
  });
});

// ─── submitBoardingForApproval ───────────────────────────────────────────────

describe('submitBoardingForApproval', () => {
  it('calls PATCH /boardings/:id/submit', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ boarding: {} }));
    await submitBoardingForApproval('b1');
    expect(mockPatch).toHaveBeenCalledWith('/boardings/b1/submit');
  });
});

// ─── deactivateBoarding / activateBoarding ──────────────────────────────────

describe('deactivateBoarding', () => {
  it('calls PATCH /boardings/:id/deactivate', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ boarding: {} }));
    await deactivateBoarding('b1');
    expect(mockPatch).toHaveBeenCalledWith('/boardings/b1/deactivate');
  });
});

describe('activateBoarding', () => {
  it('calls PATCH /boardings/:id/activate', async () => {
    mockPatch.mockResolvedValueOnce(okEnvelope({ boarding: {} }));
    await activateBoarding('b1');
    expect(mockPatch).toHaveBeenCalledWith('/boardings/b1/activate');
  });
});

// ─── deleteBoardingImage ─────────────────────────────────────────────────────

describe('deleteBoardingImage', () => {
  it('calls DELETE /boardings/:id/images/:imageId', async () => {
    mockDelete.mockResolvedValueOnce(okEnvelope(null));
    await deleteBoardingImage('b1', 'img1');
    expect(mockDelete).toHaveBeenCalledWith('/boardings/b1/images/img1');
  });
});

// ─── getBoardingReviews ──────────────────────────────────────────────────────

describe('getBoardingReviews', () => {
  it('calls GET /boardings/:slug/reviews', async () => {
    mockGet.mockResolvedValueOnce(okEnvelope({ reviews: [] }));
    await getBoardingReviews('my-place');
    expect(mockGet).toHaveBeenCalledWith('/boardings/my-place/reviews');
  });
});
