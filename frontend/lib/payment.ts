import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type {
  DetailedPayment,
  CreatePaymentPayload,
  RejectPaymentPayload,
} from '@/types/payment.types';

/**
 * Upload a local image file to `PUT /payments/proof-image` and return the
 * hosted URL. Uses the axios instance so the Authorization header is added
 * automatically and React Native handles the multipart boundary correctly.
 */
export async function uploadProofImage(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'proof.jpg';
  const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('proofImage', { uri, name: filename, type } as unknown as Blob);

  const response = await api.put<UniStayApiResponse<{ proofImageUrl: string }>>(
    '/payments/proof-image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data.data.proofImageUrl;
}

export async function createPayment(payload: CreatePaymentPayload) {
  const response = await api.post<UniStayApiResponse<{ payment: DetailedPayment }>>(
    '/payments',
    payload,
  );
  return response.data;
}

export async function getMyPayments() {
  const response = await api.get<UniStayApiResponse<{ payments: DetailedPayment[] }>>(
    '/payments/my-payments',
  );
  return response.data;
}

export async function getPaymentById(id: string) {
  const response = await api.get<UniStayApiResponse<{ payment: DetailedPayment }>>(
    `/payments/${id}`,
  );
  return response.data;
}

export async function getBoardingPayments() {
  const response = await api.get<UniStayApiResponse<{ payments: DetailedPayment[] }>>(
    '/payments/my-boardings',
  );
  return response.data;
}

export async function confirmPayment(id: string) {
  const response = await api.patch<UniStayApiResponse<{ payment: DetailedPayment }>>(
    `/payments/${id}/confirm`,
  );
  return response.data;
}

export async function rejectPayment(id: string, payload: RejectPaymentPayload) {
  const response = await api.patch<UniStayApiResponse<{ payment: DetailedPayment }>>(
    `/payments/${id}/reject`,
    payload,
  );
  return response.data;
}
