import api from './api';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  uri: string,
  folder = 'unistay'
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'upload.jpg';
  const type = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';

  formData.append('file', { uri, name: filename, type } as unknown as Blob);
  formData.append('folder', folder);

  const response = await api.post<CloudinaryUploadResult>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}
