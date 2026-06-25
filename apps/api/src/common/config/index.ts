import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: required('MONGODB_URI'),
  redisUrl: required('REDIS_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieSecret: required('COOKIE_SECRET'),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiUrl: process.env.BACKEND_URL || 'http://localhost:4000/api/v1',
  emailProviderApiKey: process.env.SENDGRID_API_KEY || process.env.SMTP_PASSWORD || '',
  smsProviderApiKey: process.env.TWILIO_AUTH_TOKEN || ''
};

export const redisClient = createClient({ url: config.redisUrl });
redisClient.on('error', (error: Error) => {
  console.error('Redis error', error);
});

export const connectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
