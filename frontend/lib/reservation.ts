import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  Reservation,
  RentalPeriod,
  CreateReservationPayload,
  RejectReservationPayload,
} from '@/types/reservation.types';

export async function createReservation(payload: CreateReservationPayload) {
  const response = await api.post<UniStayApiResponse<{ reservation: Reservation }>>(
    '/reservations',
    payload,
  );
  return response.data;
}

export async function getMyReservations() {
  const response = await api.get<UniStayApiResponse<{ reservations: Reservation[] }>>(
    '/reservations/my-requests',
  );
  return response.data;
}

export async function getReceivedReservations() {
  const response = await api.get<UniStayApiResponse<{ reservations: Reservation[] }>>(
    '/reservations/my-boardings',
  );
  return response.data;
}

export async function getReservationById(id: string) {
  const response = await api.get<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservations/${id}`,
  );
  return response.data;
}

export async function getRentalPeriods(reservationId: string) {
  const response = await api.get<UniStayApiResponse<{ rentalPeriods: RentalPeriod[] }>>(
    `/reservations/${reservationId}/rental-periods`,
  );
  return response.data;
}

export async function approveReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservations/${id}/approve`,
  );
  return response.data;
}

export async function rejectReservation(id: string, payload: RejectReservationPayload) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservations/${id}/reject`,
    payload,
  );
  return response.data;
}

export async function cancelReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservations/${id}/cancel`,
  );
  return response.data;
}

export async function completeReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservations/${id}/complete`,
  );
  return response.data;
}

