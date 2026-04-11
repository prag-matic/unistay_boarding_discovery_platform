export type BoardingType = 'SINGLE_ROOM' | 'SHARED_ROOM' | 'ANNEX' | 'HOUSE';
export type GenderPreference = 'MALE' | 'FEMALE' | 'ANY';
export type BoardingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';

export type AmenityName =
  | 'WIFI'
  | 'AIR_CONDITIONING'
  | 'HOT_WATER'
  | 'LAUNDRY'
  | 'PARKING'
  | 'SECURITY'
  | 'KITCHEN'
  | 'GYM'
  | 'SWIMMING_POOL'
  | 'STUDY_ROOM'
  | 'COMMON_AREA'
  | 'BALCONY'
  | 'GENERATOR'
  | 'WATER_TANK';

export interface BoardingAmenity {
  id: string;
  name: AmenityName;
  createdAt: string;
}

export interface BoardingRule {
  id: string;
  rule: string;
}

export interface BoardingImage {
  id: string;
  url: string;
  publicId: string;
  createdAt: string;
}

export interface BoardingOwner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Boarding {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  description: string;
  boardingType: BoardingType;
  genderPref: GenderPreference;
  monthlyRent: number;
  maxOccupants: number;
  currentOccupants: number;
  status: BoardingStatus;
  address: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
  nearUniversity?: string;
  rejectionReason: string | null;
  isDeleted: boolean;
  amenities: BoardingAmenity[];
  images: BoardingImage[];
  rules: BoardingRule[];
  owner: BoardingOwner;
  createdAt: string;
  updatedAt: string;
}

export interface SavedBoarding {
  id: string;
  boardingId: string;
  studentId: string;
  createdAt: string;
  boarding: Boarding;
}

export interface BoardingReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface BoardingFilters {
  district?: string;
  city?: string;
  minRent?: number;
  maxRent?: number;
  boardingType?: BoardingType;
  genderPref?: GenderPreference;
  amenities?: AmenityName[];
  nearUniversity?: string;
}

export type SortOption = 'RELEVANCE' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST';

export interface CreateBoardingData {
  title: string;
  description: string;
  boardingType: BoardingType | '';
  genderPref: GenderPreference | '';
  maxOccupants: number;
  currentOccupants: number;
  monthlyRent: number;
  nearUniversity: string;
  address: string;
  city: string;
  district: string;
  latitude?: number;
  longitude?: number;
  amenities: AmenityName[];
  imageUris: string[];
  rules: string[];
}
