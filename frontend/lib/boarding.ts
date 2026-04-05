import api from './api';
import logger from './logger';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  Boarding,
  BoardingReview,
  BoardingType,
  GenderPreference,
  AmenityName,
  BoardingImage,
} from '@/types/boarding.types';

export interface SearchBoardingsParams {
  page?: number;
  size?: number;
  city?: string;
  district?: string;
  minRent?: number;
  maxRent?: number;
  boardingType?: BoardingType;
  genderPref?: GenderPreference;
  amenities?: AmenityName[];
  nearUniversity?: string;
  search?: string;
  sortBy?: 'monthlyRent' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface SearchBoardingsResponse {
  boarding: Boarding[];
  pagination: {
    total: number;
    page: number;
    size: number;
    totalPages: number;
  };
}

export interface CreateBoardingPayload {
  title: string;
  description: string;
  city: string;
  district: string;
  address?: string;
  monthlyRent: number;
  boardingType: BoardingType;
  genderPref: GenderPreference;
  latitude: number;
  longitude: number;
  maxOccupants: number;
  currentOccupants?: number;
  amenities?: AmenityName[];
  nearUniversity?: string;
  rules?: string[];
}

export type UpdateBoardingPayload = Partial<CreateBoardingPayload>;

export async function searchBoardings(params: SearchBoardingsParams = {}) {
  logger.boarding.debug('searchBoardings', { params });
  const query: Record<string, string> = {};
  if (params.page !== undefined) query.page = String(params.page);
  if (params.size !== undefined) query.size = String(params.size);
  if (params.city) query.city = params.city;
  if (params.district) query.district = params.district;
  if (params.minRent !== undefined) query.minRent = String(params.minRent);
  if (params.maxRent !== undefined) query.maxRent = String(params.maxRent);
  if (params.boardingType) query.boardingType = params.boardingType;
  if (params.genderPref) query.genderPref = params.genderPref;
  if (params.amenities?.length) query.amenities = params.amenities.join(',');
  if (params.nearUniversity) query.nearUniversity = params.nearUniversity;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const response = await api.get<UniStayApiResponse<SearchBoardingsResponse>>('/boardings', {
    params: query,
  });
  return response.data;
}

export async function getBoardingBySlug(slug: string) {
  logger.boarding.debug('getBoardingBySlug', { slug });
  const response = await api.get<UniStayApiResponse<{ boarding: Boarding }>>(
    `/boardings/${slug}`,
  );
  return response.data;
}

export async function getMyListings() {
  logger.boarding.debug('getMyListings');
  const response = await api.get<UniStayApiResponse<{ boardings: Boarding[] }>>(
    '/boardings/my-listings',
  );
  return response.data;
}

export async function createBoarding(payload: CreateBoardingPayload) {
  logger.boarding.debug('createBoarding', { title: payload.title, city: payload.city });
  const response = await api.post<UniStayApiResponse<{ boarding: Boarding }>>(
    '/boardings',
    payload,
  );
  return response.data;
}

export async function updateBoarding(id: string, payload: UpdateBoardingPayload) {
  logger.boarding.debug('updateBoarding', { id });
  const response = await api.put<UniStayApiResponse<{ boarding: Boarding }>>(
    `/boardings/${id}`,
    { ...payload, id },
  );
  return response.data;
}

export async function submitBoardingForApproval(id: string) {
  logger.boarding.debug('submitBoardingForApproval', { id });
  const response = await api.patch<UniStayApiResponse<{ boarding: Boarding }>>(
    `/boardings/${id}/submit`,
  );
  return response.data;
}

export async function deactivateBoarding(id: string) {
  logger.boarding.debug('deactivateBoarding', { id });
  const response = await api.patch<UniStayApiResponse<{ boarding: Boarding }>>(
    `/boardings/${id}/deactivate`,
  );
  return response.data;
}

export async function activateBoarding(id: string) {
  logger.boarding.debug('activateBoarding', { id });
  const response = await api.patch<UniStayApiResponse<{ boarding: Boarding }>>(
    `/boardings/${id}/activate`,
  );
  return response.data;
}

export async function uploadBoardingImages(id: string, files: FormData) {
  logger.boarding.debug('uploadBoardingImages', { id });
  const response = await api.post<UniStayApiResponse<{ images: BoardingImage[] }>>(
    `/boardings/${id}/images`,
    files,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function deleteBoardingImage(id: string, imageId: string) {
  logger.boarding.debug('deleteBoardingImage', { id, imageId });
  const response = await api.delete<UniStayApiResponse<null>>(
    `/boardings/${id}/images/${imageId}`,
  );
  return response.data;
}

export async function getBoardingReviews(slug: string) {
  logger.boarding.debug('getBoardingReviews', { slug });
  const response = await api.get<UniStayApiResponse<{ reviews: BoardingReview[] }>>(
    `/boardings/${slug}/reviews`,
 );
 
  return response.data;
}
