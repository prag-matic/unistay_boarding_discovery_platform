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

  return {
    BoardingAmenityType,
    Prisma: {
      PrismaClientKnownRequestError,
    },
    PrismaClient: vi.fn(),
  };
});
