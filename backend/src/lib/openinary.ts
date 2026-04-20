import { config } from "@/config/env.js";

/**
 * Openinary client for image and video storage
 * Openinary provides S3-compatible storage with image transformations
 */

interface OpeninaryConfig {
  baseUrl: string;
  publicUrl: string;
  apiKey?: string;
}

interface UploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  };
}

interface UploadResponse {
  success: boolean;
  url: string;
  publicId: string;
  path: string;
}

class OpeninaryClient {
  private baseUrl: string;
  private publicUrl: string;
  private apiKey?: string;

  constructor(cfg: OpeninaryConfig) {
    this.baseUrl = cfg.baseUrl;
    this.publicUrl = cfg.publicUrl;
    this.apiKey = cfg.apiKey;
  }
  /**
   * Upload a file to Openinary storage
   */
  async upload(
    file: Buffer | NodeJS.ReadableStream,
    options?: UploadOptions,
  ): Promise<UploadResponse> {
    const formData = new FormData();

    if (file instanceof Buffer) {
      const uint8Array = new Uint8Array(file);
      formData.append("file", new Blob([uint8Array]));
    } else {
      formData.append("file", new Blob([]));
    }

    if (options?.folder) formData.append("folder", options.folder);
    if (options?.publicId) formData.append("public_id", options.publicId);

    const headers: Record<string, string> = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary upload failed: ${error}`);
    }

    return (await response.json()) as UploadResponse;
  }

  /**
   * Upload and convert image to WebP format
   */
  async uploadImageWebp(
    file: Buffer,
    folder: string = "reviews/images",
  ): Promise<UploadResponse> {
    const formData = new FormData();
    const uint8Array = new Uint8Array(file);
    formData.append("file", new Blob([uint8Array]));
    formData.append("folder", folder);
    formData.append("format", "webp");
    formData.append("quality", "80");

    const headers: Record<string, string> = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary image upload failed: ${error}`);
    }

    return (await response.json()) as UploadResponse;
  }

  /**
   * Upload and convert video to WebM format
   */
  async uploadVideoWebm(
    file: Buffer,
    folder: string = "reviews/videos",
  ): Promise<UploadResponse> {
    const formData = new FormData();
    const uint8Array = new Uint8Array(file);
    formData.append("file", new Blob([uint8Array]));
    formData.append("folder", folder);
    formData.append("format", "webm");

    const headers: Record<string, string> = {};
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary video upload failed: ${error}`);
    }

    return (await response.json()) as UploadResponse;
  }

  /**
   * Get the URL for a stored asset
   */
  getUrl(
    publicId: string,
    transformations?: UploadOptions["transformation"],
  ): string {
    let url = `${this.publicUrl}/assets/${publicId}`;

    if (transformations) {
      const params = new URLSearchParams();
      if (transformations.width)
        params.append("w", transformations.width.toString());
      if (transformations.height)
        params.append("h", transformations.height.toString());
      if (transformations.quality) params.append("q", transformations.quality);
      if (transformations.format) params.append("f", transformations.format);
      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Delete an asset from Openinary
   */
  async delete(publicId: string): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(`${this.baseUrl}/assets/${publicId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary delete failed: ${error}`);
    }
  }
}

export const openinary = new OpeninaryClient({
  baseUrl: config.openinary.baseUrl,
  publicUrl: config.openinary.publicUrl,
  apiKey: config.openinary.apiKey,
});
export default openinary;
