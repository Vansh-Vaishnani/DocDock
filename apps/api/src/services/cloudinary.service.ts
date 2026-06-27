import { v2 as cloudinary } from 'cloudinary';

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
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `docdock/${folder}`,
    resource_type: 'auto'
  });
  return result.secure_url;
}
