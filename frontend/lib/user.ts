import api from './api';
import type { UniStayApiResponse } from '@/types/api.types';
import type { UpdateProfileRequest, User } from '@/types/user.types';

export async function getCurrentUserProfile() {
  const response = await api.get<UniStayApiResponse<User>>('/users/me');
  return response.data.data;
}

export async function updateCurrentUserProfile(payload: UpdateProfileRequest) {
  const response = await api.put<UniStayApiResponse<User>>('/users/me', payload);
  return response.data.data;
}

export async function uploadProfileImage(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'profile.jpg';
  const lower = filename.toLowerCase();
  const type = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/jpeg';

  const formData = new FormData();
  formData.append('profileImage', { uri, name: filename, type } as unknown as Blob);

  const response = await api.put<UniStayApiResponse<{ profileImageUrl: string }>>(
    '/users/me/profile-image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data.data.profileImageUrl;
}
