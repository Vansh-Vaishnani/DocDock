import path from 'path';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { validateEnv } from './envSchema';

type RedisSocketOptions = NonNullable<Parameters<typeof createClient>[0]>['socket'];

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const envCandidates = [
  path.resolve(process.cwd(), envFile),
  path.resolve(process.cwd(), '../../', envFile),
  path.resolve(process.cwd(), '../../..', envFile),
  path.resolve(__dirname, '../../../../../' + envFile)
];

for (const candidate of envCandidates) {
  dotenv.config({ path: candidate });
}

// Validate environment variables
const env = validateEnv();

const redisUrl = env.REDIS_URL.trim();
const redisUrlProtocol = (() => {
  try {
    return new URL(redisUrl).protocol;
  } catch {
    return 'redis:';
  }
})();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  mongoUri: env.MONGODB_URI,
  redisUrl,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  cookieSecret: env.COOKIE_SECRET,
  cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: env.CLOUDINARY_API_SECRET || '',
  razorpayKeyId: env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET || '',
  appUrl: env.APP_URL,
  apiUrl: env.BACKEND_URL,
  emailProviderApiKey: env.SENDGRID_API_KEY || '',
  smsProviderApiKey: env.TWILIO_AUTH_TOKEN || '',
  twilioAccountSid: env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: env.TWILIO_AUTH_TOKEN || '',
  devAutoVerifyDoctor: env.DEV_AUTO_VERIFY_DOCTOR
};

const redisIsTls = redisUrlProtocol === 'rediss:' || redisUrl.includes('.upstash.io');
const redisSocketOptions: RedisSocketOptions = redisIsTls
  ? { tls: true, reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000) }
  : { tls: false, reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000) };

export const redisClient = createClient({
  url: config.redisUrl,
  socket: redisSocketOptions,
});

redisClient.on('error', (error: Error) => {
  console.error('🔴 Redis error:', error);
});

redisClient.on('connect', () => {
  console.log('🟢 Redis connected');
});

redisClient.on('end', () => {
  console.log('🔴 Redis connection closed');
});

let redisConnectPromise: Promise<void> | null = null;

export const connectRedis = async (): Promise<void> => {
  if (redisClient.isOpen) {
    return;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    try {
      await redisClient.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Unable to connect to Redis:', error);
      throw error;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
};
