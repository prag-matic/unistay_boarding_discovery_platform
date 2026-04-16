import api from './api';
import logger from './logger';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  VisitRequest,
  CreateVisitRequestPayload,
  RejectVisitPayload,
  ReservedVisitSlot,
} from '@/types/visit.types';

export async function createVisitRequest(payload: CreateVisitRequestPayload) {
  logger.visit.debug('createVisitRequest', { boardingId: payload.boardingId });
  const response = await api.post<UniStayApiResponse<{ visitRequest: VisitRequest }>>(
    '/visit-requests',
    payload,
  );
  return response.data;
}

export async function getMyVisitRequests() {
  logger.visit.debug('getMyVisitRequests');
  const response = await api.get<UniStayApiResponse<{ visitRequests: VisitRequest[] }>>(
    '/visit-requests/my-requests',
  );
  return response.data;
}

export async function getVisitRequestById(id: string) {
  logger.visit.debug('getVisitRequestById', { id });
  const response = await api.get<UniStayApiResponse<{ visitRequest: VisitRequest }>>(
    `/visit-requests/${id}`,
  );
  return response.data;
}

export async function getReceivedVisitRequests() {
  logger.visit.debug('getReceivedVisitRequests');
  const response = await api.get<UniStayApiResponse<{ visitRequests: VisitRequest[] }>>(
    '/visit-requests/my-boardings',
  );
  return response.data;
}

export async function approveVisitRequest(id: string) {
  logger.visit.debug('approveVisitRequest', { id });
  const response = await api.patch<UniStayApiResponse<{ visitRequest: VisitRequest }>>(
    `/visit-requests/${id}/approve`,
  );
  return response.data;
}

export async function rejectVisitRequest(id: string, payload: RejectVisitPayload) {
  logger.visit.debug('rejectVisitRequest', { id });
  const response = await api.patch<UniStayApiResponse<{ visitRequest: VisitRequest }>>(
    `/visit-requests/${id}/reject`,
    payload,
  );
  return response.data;
}

export async function cancelVisitRequest(id: string) {
  logger.visit.debug('cancelVisitRequest', { id });
  const response = await api.patch<UniStayApiResponse<{ visitRequest: VisitRequest }>>(
    `/visit-requests/${id}/cancel`,
  );
  return response.data;
}

export async function getVisitRequestAvailability(payload: {
  boardingId: string;
  from: string;
  to: string;
}) {
  logger.visit.debug('getVisitRequestAvailability', {
    boardingId: payload.boardingId,
    from: payload.from,
    to: payload.to,
  });

  const response = await api.get<
    UniStayApiResponse<{ reservedSlots: ReservedVisitSlot[] }>
  >('/visit-requests/availability', {
    params: payload,
  });

  return response.data;
}

