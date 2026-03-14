import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { config } from '@/config/env.js';

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
}

let configured = false;

function ensureConfigured(): boolean {
    if (configured) return true;

    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    	return false;
	}

  	cloudinary.config({
    	cloud_name: config.cloudinary.cloudName,
    	api_key: config.cloudinary.apiKey,
    	api_secret: config.cloudinary.apiSecret,
  	});

  	configured = true;
  	return true;
}

export async function uploadProfileImage(fileBuffer: Buffer, mimetype: string): Promise<string> {

  	if (!ensureConfigured()) {
    	throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  	}

  	return new Promise((resolve, reject) => {
    	const uploadStream = cloudinary.uploader.upload_stream({
        	folder: config.cloudinary.uploadFolder,
        	resource_type: 'image',
        	format: mimetype === 'image/png' ? 'png' : 'jpg',
      	},

      	(error, result) => {
        	if (error || !result) {
          		return reject(error ?? new Error('Upload failed'));
        	}

        	resolve(result.secure_url);
      	},
    );
    
    const stream = Readable.from(fileBuffer);
    stream.pipe(uploadStream);

  });
}

export async function uploadBoardingImage(fileBuffer: Buffer, mimetype: string,): Promise<CloudinaryUploadResult> {

  	if (!ensureConfigured()) {
    	throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  	}

  	let format: string;

  	if (mimetype === 'image/png') {
    	format = 'png';
  	} else if (mimetype === 'image/webp') {
    	format = 'webp';
  	} else {
    	format = 'jpg';
  	}

  	return new Promise((resolve, reject) => {
  	
		const uploadStream = cloudinary.uploader.upload_stream({
			folder: 'unistay/boarding-images',
			resource_type: 'image',
		},
		
		(error, result) => {

			if (error) {
				return reject(error);
			}
		
			if (!result) {
				return reject(new Error('Upload failed: No result returned'));
			}

			resolve({ url: result.secure_url, publicId: result.public_id });

			},
		);
	
		const stream = Readable.from(fileBuffer);
		stream.pipe(uploadStream);
	
	});
}

export async function deleteBoardingImage(publicId: string): Promise<void> {
  	if (!ensureConfigured()) {
    	throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  	}

  	await cloudinary.uploader.destroy(publicId);
}
