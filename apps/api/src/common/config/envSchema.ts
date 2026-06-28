import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().url('Invalid MongoDB URI'),
  REDIS_URL: z.string().url('Invalid Redis URL'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  BACKEND_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default('http://localhost:4000'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  DEV_AUTO_VERIFY_DOCTOR: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // Note: development-only bypass removed; do not add runtime flags for status transitions
});

export type Environment = z.infer<typeof envSchema>;

export const validateEnv = (): Environment => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.errors
      .map((error) => `${error.path.join('.')}: ${error.message}`)
      .join('\n');
    
    throw new Error(`Environment validation failed:\n${missingVars}`);
  }

  return result.data;
};
