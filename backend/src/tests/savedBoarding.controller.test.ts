import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma.js', () => {
  const db = {
    boarding: { findUnique: vi.fn() },
    savedBoarding: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  };
  return { default: db, prisma: db };
});

import prisma from '@/lib/prisma.js';
import { saveBoarding, unsaveBoarding, getSavedBoardings } from '@/controllers/savedBoarding.controller.js';
import { BoardingNotFoundError, ValidationError } from '@/errors/AppError.js';

const db = prisma as any;

function mockReq(o: Record<string, unknown> = {}) {
  return { body: {}, params: {}, user: { userId: 'student1' }, ...o } as any;
}
function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const next = vi.fn();
const activeBoarding = { id: 'b1', status: 'ACTIVE', isDeleted: false };

beforeEach(() => vi.clearAllMocks());

describe('saveBoarding', () => {
  it('saves boarding and returns 201', async () => {
    db.boarding.findUnique.mockResolvedValue(activeBoarding);
    db.savedBoarding.findUnique.mockResolvedValue(null);
    db.savedBoarding.create.mockResolvedValue({ id: 's1', boardingId: 'b1', studentId: 'student1', createdAt: new Date() });
    const res = mockRes();
    await saveBoarding(mockReq({ params: { boardingId: 'b1' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('throws BoardingNotFoundError when boarding not found', async () => {
    db.boarding.findUnique.mockResolvedValue(null);
    await saveBoarding(mockReq({ params: { boardingId: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
  });

  it('throws ValidationError when already saved', async () => {
    db.boarding.findUnique.mockResolvedValue(activeBoarding);
    db.savedBoarding.findUnique.mockResolvedValue({ id: 's1' });
    await saveBoarding(mockReq({ params: { boardingId: 'b1' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});

describe('unsaveBoarding', () => {
  it('unsaves boarding', async () => {
    db.savedBoarding.findUnique.mockResolvedValue({ id: 's1' });
    db.savedBoarding.delete.mockResolvedValue({});
    const res = mockRes();
    await unsaveBoarding(mockReq({ params: { boardingId: 'b1' } }), res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('throws BoardingNotFoundError when not saved', async () => {
    db.savedBoarding.findUnique.mockResolvedValue(null);
    await unsaveBoarding(mockReq({ params: { boardingId: 'x' } }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
  });
});

describe('getSavedBoardings', () => {
  it('returns saved boardings for student', async () => {
    db.savedBoarding.findMany.mockResolvedValue([{ id: 's1', createdAt: new Date(), boarding: activeBoarding }]);
    const res = mockRes();
    await getSavedBoardings(mockReq(), res, next);
    expect(res.json).toHaveBeenCalled();
    expect(db.savedBoarding.findMany.mock.calls[0][0].where.studentId).toBe('student1');
  });
});
