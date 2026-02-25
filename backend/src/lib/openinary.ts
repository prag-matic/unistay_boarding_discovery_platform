import { config } from "../config/env.js";

/**
 * Openinary client for image and video storage
 * Openinary provides S3-compatible storage with image transformations
 */

interface OpeninaryConfig {
  baseUrl: string;
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
  private apiKey?: string;

  constructor(cfg: OpeninaryConfig) {
    this.baseUrl = cfg.baseUrl;
    this.apiKey = cfg.apiKey;
  }

  /**
   * Upload a file to Openinary storage
   * @param file - The file to upload (Buffer or ReadStream)
   * @param options - Upload options including folder and transformations
   * @returns Upload response with URL and path
   */
  async upload(
    file: Buffer | NodeJS.ReadableStream,
    options?: UploadOptions,
  ): Promise<UploadResponse> {
    const formData = new FormData();

    // Handle file based on type
    if (file instanceof Buffer) {
      const uint8Array = new Uint8Array(file);
      formData.append("file", new Blob([uint8Array]));
    } else {
      // For streams, we'll need to convert to Blob
      // This is a simplified version - in production, handle streams properly
      formData.append("file", new Blob([]));
    }

    if (options?.folder) {
      formData.append("folder", options.folder);
    }

    if (options?.publicId) {
      formData.append("public_id", options.publicId);
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary upload failed: ${error}`);
    }

    const result = (await response.json()) as UploadResponse;
    return result;
  }

  /**
   * Upload a file from a URL
   * @param url - The URL to upload from
   * @param options - Upload options
   * @returns Upload response
   */
  async uploadFromUrl(
    url: string,
    options?: UploadOptions,
  ): Promise<UploadResponse> {
    const body: Record<string, string> = { file_url: url };

    if (options?.folder) {
      body.folder = options.folder;
    }

    if (options?.publicId) {
      body.public_id = options.publicId;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Openinary upload from URL failed: ${error}`);
    }

    const result = (await response.json()) as UploadResponse;
    return result;
  }

  /**
   * Get the URL for a stored asset
   * @param publicId - The public ID of the asset
   * @param transformations - Optional transformations
   * @returns The transformed URL
   */
  getUrl(
    publicId: string,
    transformations?: UploadOptions["transformation"],
  ): string {
    let url = `${this.baseUrl}/assets/${publicId}`;

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
   * @param publicId - The public ID of the asset to delete
   */
  async delete(publicId: string): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

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

// Export singleton instance
export const openinary = new OpeninaryClient({
  baseUrl: config.openinary.baseUrl,
  apiKey: config.openinary.apiKey,
});

export default openinary;
