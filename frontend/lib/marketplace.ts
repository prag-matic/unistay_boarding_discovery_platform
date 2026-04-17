import api from './api';
import logger from './logger';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  CreateMarketplaceItemData,
  MarketplaceFilters,
  MarketplaceItem,
  MarketplaceReportReason,
} from '@/types/marketplace.types';

export const MARKETPLACE_CATEGORIES = [
  'Electronics',
  'Books',
  'Furniture',
  'Clothing',
  'Kitchen',
  'Study Materials',
  'Sports',
  'Appliances',
  'Other',
] as const;

interface MarketplacePagination {
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

interface MarketplaceSearchResponse {
  items: MarketplaceItem[];
  pagination: MarketplacePagination;
}

export interface SearchMarketplaceParams extends MarketplaceFilters {
  page?: number;
  size?: number;
  sortBy?: 'price' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export async function searchMarketplaceItems(params: SearchMarketplaceParams = {}) {
  logger.marketplace.debug('searchMarketplaceItems', { params });
  const query: Record<string, string> = {};

  if (params.page !== undefined) query.page = String(params.page);
  if (params.size !== undefined) query.size = String(params.size);
  if (params.search) query.search = params.search;
  if (params.adType) query.adType = params.adType;
  if (params.category) query.category = params.category;
  if (params.city) query.city = params.city;
  if (params.district) query.district = params.district;
  if (params.minPrice !== undefined) query.minPrice = String(params.minPrice);
  if (params.maxPrice !== undefined) query.maxPrice = String(params.maxPrice);
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortDir) query.sortDir = params.sortDir;

  const response = await api.get<UniStayApiResponse<MarketplaceSearchResponse>>('/marketplace', {
    params: query,
  });

  return response.data;
}

export async function getMarketplaceItemById(id: string) {
  const response = await api.get<UniStayApiResponse<{ item: MarketplaceItem }>>(
    `/marketplace/${id}`,
  );
  return response.data;
}

export async function getMyMarketplaceAds() {
  const response = await api.get<UniStayApiResponse<{ items: MarketplaceItem[] }>>(
    '/marketplace/my-ads',
  );
  return response.data;
}

export async function createMarketplaceItem(payload: CreateMarketplaceItemData) {
  const response = await api.post<UniStayApiResponse<{ item: MarketplaceItem }>>(
    '/marketplace',
    payload,
  );
  return response.data;
}

export async function updateMarketplaceItem(
  id: string,
  payload: Partial<CreateMarketplaceItemData>,
) {
  const response = await api.put<UniStayApiResponse<{ item: MarketplaceItem }>>(
    `/marketplace/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteMarketplaceItem(id: string) {
  const response = await api.delete<UniStayApiResponse<null>>(`/marketplace/${id}`);
  return response.data;
}

export async function uploadMarketplaceImages(id: string, files: FormData) {
  const response = await api.post<UniStayApiResponse<{ images: MarketplaceItem['images'] }>>(
    `/marketplace/${id}/images`,
    files,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function deleteMarketplaceImage(id: string, imageId: string) {
  const response = await api.delete<UniStayApiResponse<null>>(
    `/marketplace/${id}/images/${imageId}`,
  );
  return response.data;
}

export async function reportMarketplaceItem(
  id: string,
  reason: MarketplaceReportReason,
  details?: string,
) {
  const response = await api.post<UniStayApiResponse<null>>(`/marketplace/${id}/report`, {
    reason,
    details,
  });
  return response.data;
}
