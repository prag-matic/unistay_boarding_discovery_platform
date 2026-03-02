import { z } from 'zod';

const SRI_LANKA_LAT_MIN = 5.9;
const SRI_LANKA_LAT_MAX = 9.9;
const SRI_LANKA_LNG_MIN = 79.5;
const SRI_LANKA_LNG_MAX = 81.9;

export const createBoardingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be at most 200 characters'),
  description: z.string().min(30, 'Description must be at least 30 characters').max(5000, 'Description must be at most 5000 characters'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  address: z.string().optional(),
  monthlyRent: z.number().int().min(1000, 'Monthly rent must be at least 1000').max(500000, 'Monthly rent must be at most 500000'),
  boardingType: z.enum(['SINGLE_ROOM', 'SHARED_ROOM', 'ANNEX', 'HOUSE']),
  genderPref: z.enum(['MALE', 'FEMALE', 'ANY']),
  isFurnished: z.boolean().default(false),
  hasWifi: z.boolean().default(false),
  nearUniversity: z.string().optional(),
  latitude: z.number().min(SRI_LANKA_LAT_MIN, `Latitude must be within Sri Lanka bounds (${SRI_LANKA_LAT_MIN}-${SRI_LANKA_LAT_MAX})`).max(SRI_LANKA_LAT_MAX, `Latitude must be within Sri Lanka bounds (${SRI_LANKA_LAT_MIN}-${SRI_LANKA_LAT_MAX})`),
  longitude: z.number().min(SRI_LANKA_LNG_MIN, `Longitude must be within Sri Lanka bounds (${SRI_LANKA_LNG_MIN}-${SRI_LANKA_LNG_MAX})`).max(SRI_LANKA_LNG_MAX, `Longitude must be within Sri Lanka bounds (${SRI_LANKA_LNG_MIN}-${SRI_LANKA_LNG_MAX})`),
  maxOccupants: z.number().int().min(1, 'Max occupants must be at least 1').max(20, 'Max occupants must be at most 20'),
  currentOccupants: z.number().int().min(0).default(0),
  rules: z.array(z.string().min(1)).optional(),
});

export const updateBoardingSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(30).max(5000).optional(),
  city: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  address: z.string().optional(),
  monthlyRent: z.number().int().min(1000).max(500000).optional(),
  boardingType: z.enum(['SINGLE_ROOM', 'SHARED_ROOM', 'ANNEX', 'HOUSE']).optional(),
  genderPref: z.enum(['MALE', 'FEMALE', 'ANY']).optional(),
  isFurnished: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  nearUniversity: z.string().optional(),
  latitude: z.number().min(5.9).max(9.9).optional(),
  longitude: z.number().min(79.5).max(81.9).optional(),
  maxOccupants: z.number().int().min(1).max(20).optional(),
  currentOccupants: z.number().int().min(0).optional(),
  rules: z.array(z.string().min(1)).optional(),
});

export const rejectBoardingSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const searchBoardingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(20),
  city: z.string().optional(),
  district: z.string().optional(),
  minRent: z.coerce.number().int().positive().optional(),
  maxRent: z.coerce.number().int().positive().optional(),
  boardingType: z.enum(['SINGLE_ROOM', 'SHARED_ROOM', 'ANNEX', 'HOUSE']).optional(),
  genderPref: z.enum(['MALE', 'FEMALE', 'ANY']).optional(),
  isFurnished: z.coerce.boolean().optional(),
  hasWifi: z.coerce.boolean().optional(),
  nearUniversity: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['monthlyRent', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBoardingInput = z.infer<typeof createBoardingSchema>;
export type UpdateBoardingInput = z.infer<typeof updateBoardingSchema>;
export type RejectBoardingInput = z.infer<typeof rejectBoardingSchema>;
export type SearchBoardingsQuery = z.infer<typeof searchBoardingsQuerySchema>;
