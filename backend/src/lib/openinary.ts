interface OpeninaryConfig {
  baseUrl: string;
}

interface UploadResult {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "scale" | "crop" | "pad";
  aspectRatio?: string; // e.g., "16:9", "1:1"
  angle?: number | "auto";
  gravity?: "center" | "north" | "south" | "east" | "west" | "face" | "auto";
  background?: string; // e.g., "ffffff"
  quality?: number; // 1-100
  format?: "avif" | "webp" | "jpeg" | "png";
}

class OpeninaryClient {
  private baseUrl: string;

  constructor(config: OpeninaryConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  /**
   * Upload a file to Openinary (which stores it in MinIO)
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<UploadResult> {
    // Create multipart form data manually for Node.js
    const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;

    const chunks: Buffer[] = [];

    // Header
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`,
      ),
    );
    chunks.push(Buffer.from(`Content-Type: ${contentType}\r\n\r\n`));

    // File content
    chunks.push(file);

    // Footer
    chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(chunks);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length.toString(),
      },
      body: body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.statusText} - ${error}`);
    }

    return response.json();
  }

  /**
   * Build transformation URL from options
   */
  private buildTransformParams(options: TransformationOptions): string {
    const params: string[] = [];

    if (options.width) params.push(`w_${options.width}`);
    if (options.height) params.push(`h_${options.height}`);
    if (options.crop) params.push(`c_${options.crop}`);
    if (options.aspectRatio) params.push(`ar_${options.aspectRatio}`);
    if (options.angle) params.push(`a_${options.angle}`);
    if (options.gravity) params.push(`g_${options.gravity}`);
    if (options.background) params.push(`b_rgb:${options.background}`);
    if (options.quality) params.push(`q_${options.quality}`);
    if (options.format) params.push(`f_${options.format}`);

    return params.join(",");
  }

  /**
   * Get transformed image URL
   *
   * @param imagePath - Path to image from upload result
   * @param options - Transformation options
   * @returns Full URL to transformed image
   */
  getTransformUrl(
    imagePath: string,
    options: TransformationOptions = {},
  ): string {
    const transform = this.buildTransformParams(options);
    const path = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;

    return `${this.baseUrl}/t/${transform}/${path}`;
  }

  /**
   * Get original image URL (no transformations)
   */
  getOriginalUrl(imagePath: string): string {
    const path = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    return `${this.baseUrl}/${path}`;
  }

  /**
   * Generate multiple transformation URLs at once
   */
  getTransformUrls(
    imagePath: string,
    variants: Record<string, TransformationOptions>,
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [name, options] of Object.entries(variants)) {
      result[name] = this.getTransformUrl(imagePath, options);
    }

    return result;
  }

  /**
   * Common preset transformations
   */
  presets = {
    thumbnail: (size: number = 200): TransformationOptions => ({
      width: size,
      height: size,
      crop: "fill",
      gravity: "face",
      quality: 85,
      format: "webp",
    }),

    profilePicture: (size: number = 400): TransformationOptions => ({
      width: size,
      height: size,
      crop: "fill",
      gravity: "face",
      quality: 90,
      format: "webp",
    }),

    banner: (
      width: number = 1920,
      height: number = 600,
    ): TransformationOptions => ({
      width,
      height,
      crop: "fill",
      quality: 85,
      format: "webp",
    }),

    gallery: (size: number = 800): TransformationOptions => ({
      width: size,
      quality: 85,
      format: "webp",
    }),

    optimized: (): TransformationOptions => ({
      quality: 80,
      format: "avif",
    }),
  };
}

// Initialize from environment variables
export const openinary = new OpeninaryClient({
  baseUrl: process.env.OPENINARY_URL || "http://localhost:3001",
});

export default openinary;
