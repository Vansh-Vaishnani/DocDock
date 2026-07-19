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

/**
 * Determine correct Cloudinary resource_type from MIME type or filename.
 * Images → 'image', PDF/DOC/DOCX/TXT/CSV/XLS → 'raw', else → 'auto'
 */
function getResourceType(mimeType?: string, filename?: string): 'image' | 'raw' | 'auto' {
  const mime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (
    mime.includes('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/.test(name)
  ) {
    return 'image';
  }

  if (
    mime === 'application/pdf' ||
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'text/plain' ||
    mime === 'text/csv' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    /\.(pdf|doc|docx|txt|csv|xls|xlsx)$/.test(name)
  ) {
    return 'raw';
  }

  return 'auto';
}

/** Extract MIME type from a base64 data URI. */
function getMimeFromDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:([^;]+);/);
  return match ? match[1] : '';
}

function getExtFromMime(mimeType: string, filename?: string): string {
  const name = (filename || '').toLowerCase();
  const match = name.match(/\.(pdf|doc|docx|txt|csv|xls|xlsx|jpg|jpeg|png|gif|webp)$/);
  if (match) {
    return match[0];
  }
  const mimeMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  };
  return mimeMap[mimeType] || '';
}

export async function uploadBase64File(dataUri: string, folder: string): Promise<string> {
  ensureConfigured();

  const mimeType = getMimeFromDataUri(dataUri);
  const ext = getExtFromMime(mimeType);
  const uid = Math.random().toString(36).substring(2, 15) + '_' + Math.random().toString(36).substring(2, 15);
  const publicId = uid + ext;

  let base64Data = '';
  let extractedMimeType = mimeType;

  const commaIndex = dataUri.indexOf(',');
  if (commaIndex !== -1) {
    const header = dataUri.substring(0, commaIndex);
    if (header.startsWith('data:') && header.includes(';base64')) {
      base64Data = dataUri.substring(commaIndex + 1);
      const mimeMatch = header.match(/^data:([^;]+)/);
      if (mimeMatch) {
        extractedMimeType = mimeMatch[1];
      }
    }
  }

  if (base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    return uploadFile({ buffer, originalname: publicId, mimetype: extractedMimeType }, folder);
  }

  // Fallback if not a valid data URI
  const resourceType = getResourceType(mimeType);
  const uploadOptions: Record<string, any> = {
    folder: `docdock/${folder}`,
    resource_type: resourceType,
    public_id: publicId
  };

  if (resourceType === 'raw') {
    uploadOptions.allowed_formats = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'];
  }

  try {
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    return result.secure_url;
  } catch (err: any) {
    console.error('[Cloudinary] uploadBase64File fallback failed:', { folder, mimeType, resourceType, error: err?.message || err });
    throw err;
  }
}

export async function uploadFile(
  file: { buffer: Buffer; originalname?: string; mimetype?: string },
  folder: string
): Promise<string> {
  ensureConfigured();

  const resourceType = getResourceType(file.mimetype, file.originalname);
  const ext = getExtFromMime(file.mimetype || '', file.originalname);
  const uid = Math.random().toString(36).substring(2, 15) + '_' + Math.random().toString(36).substring(2, 15);
  const publicId = uid + ext;

  const uploadOptions: Record<string, any> = {
    folder: `docdock/${folder}`,
    resource_type: resourceType,
    public_id: publicId
  };

  if (resourceType === 'raw') {
    uploadOptions.allowed_formats = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'];
  }

  console.log('[Cloudinary] uploadFile:', { folder, mimetype: file.mimetype, originalname: file.originalname, resourceType });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] uploadFile stream error:', error);
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

