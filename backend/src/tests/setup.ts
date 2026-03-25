// Global test setup: mock @prisma/client so tests run without a real DB
import { vi } from 'vitest';

vi.mock('@prisma/client', async () => {
  const BoardingAmenityType = {
    WIFI: 'WIFI',
    AIR_CONDITIONING: 'AIR_CONDITIONING',
    HOT_WATER: 'HOT_WATER',
    LAUNDRY: 'LAUNDRY',
    PARKING: 'PARKING',
    SECURITY: 'SECURITY',
    KITCHEN: 'KITCHEN',
    GYM: 'GYM',
    SWIMMING_POOL: 'SWIMMING_POOL',
    STUDY_ROOM: 'STUDY_ROOM',
    COMMON_AREA: 'COMMON_AREA',
    BALCONY: 'BALCONY',
    GENERATOR: 'GENERATOR',
    WATER_TANK: 'WATER_TANK',
  } as const;

  const Role = { STUDENT: 'STUDENT', OWNER: 'OWNER', ADMIN: 'ADMIN' } as const;

  const BoardingType = { SINGLE_ROOM: 'SINGLE_ROOM', SHARED_ROOM: 'SHARED_ROOM', ANNEX: 'ANNEX', HOUSE: 'HOUSE' } as const;

  const GenderPref = { MALE: 'MALE', FEMALE: 'FEMALE', ANY: 'ANY' } as const;

  const BoardingStatus = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    ACTIVE: 'ACTIVE',
    REJECTED: 'REJECTED',
    INACTIVE: 'INACTIVE',
  } as const;

  const ReservationStatus = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
  } as const;

  const RentalPeriodStatus = {
    UPCOMING: 'UPCOMING',
    DUE: 'DUE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
  } as const;

  const PaymentMethod = { CASH: 'CASH', BANK_TRANSFER: 'BANK_TRANSFER', ONLINE: 'ONLINE' } as const;

  const PaymentStatus = { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', REJECTED: 'REJECTED' } as const;

  const VisitRequestStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
  } as const;

  const ReactionType = { LIKE: 'LIKE', DISLIKE: 'DISLIKE' } as const;

  // Minimal PrismaClientKnownRequestError shim for errorHandler tests
  class PrismaClientKnownRequestError extends Error {
    code: string;
    clientVersion: string;
    meta?: Record<string, unknown>;
    constructor(
      message: string,
      { code, clientVersion, meta }: { code: string; clientVersion: string; meta?: Record<string, unknown> },
    ) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.clientVersion = clientVersion;
      this.meta = meta;
      Object.setPrototypeOf(this, PrismaClientKnownRequestError.prototype);
    }
  }

  // Minimal Decimal shim that supports the arithmetic used by the payment controller
  class Decimal {
    private val: number;
    constructor(v: number | string | Decimal) {
      this.val = typeof v === 'object' ? (v as Decimal).val : Number(v);
    }
    add(other: Decimal | number | string) { return new Decimal(this.val + new Decimal(other as any).val); }
    sub(other: Decimal | number | string) { return new Decimal(this.val - new Decimal(other as any).val); }
    gt(other: Decimal | number | string) { return this.val > new Decimal(other as any).val; }
    gte(other: Decimal | number | string) { return this.val >= new Decimal(other as any).val; }
    toFixed(dp = 2) { return this.val.toFixed(dp); }
    toNumber() { return this.val; }
    toString() { return String(this.val); }
  }

  return {
    BoardingAmenityType,
    Role,
    BoardingType,
    GenderPref,
    BoardingStatus,
    ReservationStatus,
    RentalPeriodStatus,
    PaymentMethod,
    PaymentStatus,
    VisitRequestStatus,
    ReactionType,
    Prisma: {
      PrismaClientKnownRequestError,
      Decimal,
    },
    PrismaClient: vi.fn(),
  };
});
