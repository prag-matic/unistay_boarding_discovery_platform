import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma.js', () => {
  const db = {
    visitRequest: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    boarding: { findUnique: vi.fn() },
  };
  return { default: db, prisma: db };
});

import prisma from '@/lib/prisma.js';
import {
  createVisitRequest, getMyVisitRequests, getMyBoardingVisitRequests,
  getVisitRequestById, approveVisitRequest, rejectVisitRequest, cancelVisitRequest,
} from '@/controllers/visitRequest.controller.js';
import { BadRequestError, BoardingNotFoundError, ConflictError, ForbiddenError, GoneError, NotFoundError } from '@/errors/AppError.js';

const db = prisma as any;

function mockReq(overrides: Record<string, unknown> = {}) {
  return { body: {}, params: {}, user: { userId: 'student1', role: 'STUDENT' }, ...overrides } as any;
}
function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const next = vi.fn();

const futureStart = new Date(Date.now() + 2 * 3600_000).toISOString();
const futureEnd = new Date(Date.now() + 3 * 3600_000).toISOString();
const activeBoarding = { id: 'b1', ownerId: 'owner1', status: 'ACTIVE', isDeleted: false };
const fakeVR = {
  id: 'vr1', studentId: 'student1', boardingId: 'b1', status: 'PENDING',
  expiresAt: new Date(Date.now() + 72 * 3600_000), boarding: activeBoarding,
};

beforeEach(() => vi.clearAllMocks());

// ── createVisitRequest ────────────────────────────────────────────────────────
describe('createVisitRequest', () => {
  it('creates visit request and returns 201', async () => {
    db.boarding.findUnique.mockResolvedValue(activeBoarding);
    db.visitRequest.findFirst.mockResolvedValue(null);
    db.visitRequest.create.mockResolvedValue(fakeVR);
    const res = mockRes();
    await createVisitRequest(mockReq({ body: { boardingId: 'b1', requestedStartAt: futureStart, requestedEndAt: futureEnd } }), res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws BadRequestError when start is in the past', async () => {
    const pastStart = new Date(Date.now() - 1000).toISOString();
    await createVisitRequest(mockReq({ body: { boardingId: 'b1', requestedStartAt: pastStart, requestedEndAt: futureEnd } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws BadRequestError when end is before start', async () => {
    const end = new Date(Date.now() + 1 * 3600_000).toISOString(); // before futureStart
    await createVisitRequest(mockReq({ body: { boardingId: 'b1', requestedStartAt: futureStart, requestedEndAt: end } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws BoardingNotFoundError when boarding not found', async () => {
    db.boarding.findUnique.mockResolvedValue(null);
    await createVisitRequest(mockReq({ body: { boardingId: 'x', requestedStartAt: futureStart, requestedEndAt: futureEnd } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
  });

  it('throws BadRequestError when boarding not ACTIVE', async () => {
    db.boarding.findUnique.mockResolvedValue({ ...activeBoarding, status: 'INACTIVE' });
    await createVisitRequest(mockReq({ body: { boardingId: 'b1', requestedStartAt: futureStart, requestedEndAt: futureEnd } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws ConflictError when pending request already exists', async () => {
    db.boarding.findUnique.mockResolvedValue(activeBoarding);
    db.visitRequest.findFirst.mockResolvedValue(fakeVR);
    await createVisitRequest(mockReq({ body: { boardingId: 'b1', requestedStartAt: futureStart, requestedEndAt: futureEnd } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
  });
});

// ── getMyVisitRequests ────────────────────────────────────────────────────────
describe('getMyVisitRequests', () => {
  it('returns student visit requests', async () => {
    db.visitRequest.findMany.mockResolvedValue([fakeVR]);
    const res = mockRes();
    await getMyVisitRequests(mockReq(), res, next);
    expect(res.json).toHaveBeenCalled();
    expect(db.visitRequest.findMany.mock.calls[0][0].where.studentId).toBe('student1');
  });
});

// ── getMyBoardingVisitRequests ────────────────────────────────────────────────
describe('getMyBoardingVisitRequests', () => {
  it('returns visit requests for owner boardings', async () => {
    db.visitRequest.findMany.mockResolvedValue([fakeVR]);
    const res = mockRes();
    await getMyBoardingVisitRequests(mockReq({ user: { userId: 'owner1', role: 'OWNER' } }), res, next);
    expect(res.json).toHaveBeenCalled();
    expect(db.visitRequest.findMany.mock.calls[0][0].where.boarding.ownerId).toBe('owner1');
  });
});

// ── getVisitRequestById ───────────────────────────────────────────────────────
describe('getVisitRequestById', () => {
  it('returns visit request for the student', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'student1' });
    const res = mockRes();
    await getVisitRequestById(mockReq({ params: { id: 'vr1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws NotFoundError when not found', async () => {
    db.visitRequest.findUnique.mockResolvedValue(null);
    await getVisitRequestById(mockReq({ params: { id: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('allows ADMIN to access any visit request', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'other' });
    const res = mockRes();
    await getVisitRequestById(mockReq({ params: { id: 'vr1' }, user: { userId: 'admin1', role: 'ADMIN' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws ForbiddenError for unrelated user', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'other', boardingId: 'b1' });
    db.boarding.findUnique.mockResolvedValue({ ...activeBoarding, ownerId: 'another' });
    await getVisitRequestById(mockReq({ params: { id: 'vr1' }, user: { userId: 'random', role: 'STUDENT' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

// ── approveVisitRequest ───────────────────────────────────────────────────────
describe('approveVisitRequest', () => {
  it('approves a PENDING visit request', async () => {
    db.visitRequest.findUnique.mockResolvedValue(fakeVR);
    db.visitRequest.update.mockResolvedValue({ ...fakeVR, status: 'APPROVED' });
    const res = mockRes();
    await approveVisitRequest(mockReq({ params: { id: 'vr1' }, user: { userId: 'owner1', role: 'OWNER' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws NotFoundError when not found', async () => {
    db.visitRequest.findUnique.mockResolvedValue(null);
    await approveVisitRequest(mockReq({ params: { id: 'x' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('throws ForbiddenError when not owner', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, boarding: { ...activeBoarding, ownerId: 'other' } });
    await approveVisitRequest(mockReq({ params: { id: 'vr1' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('throws BadRequestError when not PENDING', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, status: 'APPROVED' });
    await approveVisitRequest(mockReq({ params: { id: 'vr1' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('throws GoneError when expired', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, expiresAt: new Date(Date.now() - 1000) });
    db.visitRequest.update.mockResolvedValue({});
    await approveVisitRequest(mockReq({ params: { id: 'vr1' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(GoneError));
  });
});

// ── rejectVisitRequest ────────────────────────────────────────────────────────
describe('rejectVisitRequest', () => {
  it('rejects a PENDING visit request', async () => {
    db.visitRequest.findUnique.mockResolvedValue(fakeVR);
    db.visitRequest.update.mockResolvedValue({ ...fakeVR, status: 'REJECTED' });
    const res = mockRes();
    await rejectVisitRequest(mockReq({ params: { id: 'vr1' }, body: { reason: 'Not available' }, user: { userId: 'owner1', role: 'OWNER' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws NotFoundError when not found', async () => {
    db.visitRequest.findUnique.mockResolvedValue(null);
    await rejectVisitRequest(mockReq({ params: { id: 'x' }, body: { reason: 'r' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('throws ForbiddenError when not owner', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, boarding: { ...activeBoarding, ownerId: 'other' } });
    await rejectVisitRequest(mockReq({ params: { id: 'vr1' }, body: { reason: 'r' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('throws BadRequestError when not PENDING', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, status: 'REJECTED' });
    await rejectVisitRequest(mockReq({ params: { id: 'vr1' }, body: { reason: 'r' }, user: { userId: 'owner1', role: 'OWNER' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});

// ── cancelVisitRequest ────────────────────────────────────────────────────────
describe('cancelVisitRequest', () => {
  it('cancels a PENDING visit request', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'student1', status: 'PENDING' });
    db.visitRequest.update.mockResolvedValue({ ...fakeVR, status: 'CANCELLED' });
    const res = mockRes();
    await cancelVisitRequest(mockReq({ params: { id: 'vr1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('cancels an APPROVED visit request', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'student1', status: 'APPROVED' });
    db.visitRequest.update.mockResolvedValue({ ...fakeVR, status: 'CANCELLED' });
    const res = mockRes();
    await cancelVisitRequest(mockReq({ params: { id: 'vr1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws NotFoundError when not found', async () => {
    db.visitRequest.findUnique.mockResolvedValue(null);
    await cancelVisitRequest(mockReq({ params: { id: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('throws ForbiddenError when not the student', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'other' });
    await cancelVisitRequest(mockReq({ params: { id: 'vr1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('throws BadRequestError for non-cancellable status', async () => {
    db.visitRequest.findUnique.mockResolvedValue({ ...fakeVR, studentId: 'student1', status: 'REJECTED' });
    await cancelVisitRequest(mockReq({ params: { id: 'vr1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});
