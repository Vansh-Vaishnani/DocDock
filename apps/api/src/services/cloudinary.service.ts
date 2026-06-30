import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

import { config } from '../common/config';

let configured = false;

const ensureConfigured = (): void => {
  if (configured) return;
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
    throw new Error('Cloudinary is not configured.');
  }
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret
  });
  configured = true;
};

export const isCloudinaryEnabled = (): boolean =>
  Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);

export async function uploadBase64File(dataUri: string, folder: string): Promise<string> {
  ensureConfigured();
  const isPdf = dataUri.startsWith('data:application/pdf');
  const publicId = Math.random().toString(36).substring(2, 15) + "_" + Math.random().toString(36).substring(2, 15) + (isPdf ? ".pdf" : "");
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `docdock/${folder}`,
    resource_type: 'image',
    public_id: publicId
  });
  return result.secure_url;
}

export async function uploadFile(file: { buffer: Buffer; originalname?: string; mimetype?: string }, folder: string): Promise<string> {
  ensureConfigured();
  const isPdf = file.originalname?.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';
  const publicId = Math.random().toString(36).substring(2, 15) + "_" + Math.random().toString(36).substring(2, 15) + (isPdf ? ".pdf" : "");
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `docdock/${folder}`,
        resource_type: 'image',
        public_id: publicId
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed: no result'));
        }
      }
    );
    
    const stream = Readable.from(file.buffer);
    stream.pipe(uploadStream);
  });
}
