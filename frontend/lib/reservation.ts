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
    '/reservation',
    payload,
  );
  return response.data;
}

export async function getMyReservations() {
  const response = await api.get<UniStayApiResponse<{ reservations: Reservation[] }>>(
    '/reservation/my-requests',
  );
  return response.data;
}

export async function getReceivedReservations() {
  const response = await api.get<UniStayApiResponse<{ reservations: Reservation[] }>>(
    '/reservation/my-boardings',
  );
  return response.data;
}

export async function getReservationById(id: string) {
  const response = await api.get<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservation/${id}`,
  );
  return response.data;
}

export async function getRentalPeriods(reservationId: string) {
  const response = await api.get<UniStayApiResponse<{ rentalPeriods: RentalPeriod[] }>>(
    `/reservation/${reservationId}/rental-periods`,
  );
  return response.data;
}

export async function approveReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservation/${id}/approve`,
  );
  return response.data;
}

export async function rejectReservation(id: string, payload: RejectReservationPayload) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservation/${id}/reject`,
    payload,
  );
  return response.data;
}

export async function cancelReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservation/${id}/cancel`,
  );
  return response.data;
}

export async function completeReservation(id: string) {
  const response = await api.patch<UniStayApiResponse<{ reservation: Reservation }>>(
    `/reservation/${id}/complete`,
  );
  return response.data;
}

