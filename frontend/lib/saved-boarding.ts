import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type { SavedBoarding } from '@/types/boarding.types';

export interface SavedBoardingEntry {
  id: string;
  boardingId: string;
  studentId: string;
  createdAt: string;
}

export async function getSavedBoardings() {
  const response = await api.get<UniStayApiResponse<{ saved: SavedBoarding[] }>>(
    '/saved-boardings',
  );
  return response.data;
}

export async function saveBoarding(boardingId: string) {
  const response = await api.post<UniStayApiResponse<{ saved: SavedBoardingEntry }>>(
    `/saved-boardings/${boardingId}`,
  );
  return response.data;
}

export async function unsaveBoarding(boardingId: string) {
  const response = await api.delete<UniStayApiResponse<null>>(
    `/saved-boardings/${boardingId}`,
  );
  return response.data;
}
