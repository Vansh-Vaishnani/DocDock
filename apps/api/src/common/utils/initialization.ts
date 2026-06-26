import mongoose from 'mongoose';
import { connectRedis, redisClient } from '../config';
import { validateEnv } from '../config/envSchema';
import { isEmailServiceEnabled } from '../../services/email.service';
import { isGoogleOAuthEnabled } from '../config/oauth';
import { isRazorpayEnabled } from '../config/providers';

export interface InitializationResult {
  success: boolean;
  checks: {
    environment: boolean;
    redis: boolean;
    mongodb: boolean;
    payment: boolean;
    email: boolean;
    oauth: boolean;
  };
  errors: string[];
}

/**
 * Validate environment variables
 */
const checkEnvironment = (): { success: boolean; errors: string[] } => {
  try {
    validateEnv();
    return { success: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errors: [message] };
  }
};

/**
 * Check Redis connection
 */
const checkRedis = async (): Promise<{ success: boolean; errors: string[] }> => {
  try {
    await connectRedis();
    // Test connection
    await redisClient.ping();
    return { success: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redis connection failed';
    return { success: false, errors: [message] };
  }
};

/**
 * Check MongoDB connection
 */
const checkMongoDB = async (): Promise<{ success: boolean; errors: string[] }> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || '');
    }
    return { success: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MongoDB connection failed';
    return { success: false, errors: [message] };
  }
};

/**
 * Check if Razorpay service is available
 */
const checkPaymentService = (): { success: boolean; errors: string[] } => {
  const enabled = isRazorpayEnabled();
  if (!enabled) {
    return {
      success: false,
      errors: ['Razorpay keys not configured. Payment service disabled.']
    };
  }
  return { success: true, errors: [] };
};

const checkEmailService = (): { success: boolean; errors: string[] } => {
  const enabled = isEmailServiceEnabled();
  if (!enabled) {
    return {
      success: false,
      errors: ['SendGrid API key not configured. Email service disabled.']
    };
  }
  return { success: true, errors: [] };
};

/**
 * Check if OAuth is configured
 */
const checkOAuth = (): { success: boolean; errors: string[] } => {
  const enabled = isGoogleOAuthEnabled();
  if (!enabled) {
    return {
      success: false,
      errors: ['Google OAuth credentials not configured. OAuth disabled.']
    };
  }
  return { success: true, errors: [] };
};

/**
 * Initialize and validate all services
 */
export const initializeServices = async (): Promise<InitializationResult> => {
  const errors: string[] = [];
  const checks = {
    environment: false,
    redis: false,
    mongodb: false,
    payment: false,
    email: false,
    oauth: false
  };

  console.log('🚀 Initializing DocDock API services...\n');

  // Check environment
  console.log('📋 Validating environment variables...');
  const envCheck = checkEnvironment();
  checks.environment = envCheck.success;
  if (envCheck.success) {
    console.log('✅ Environment variables validated');
  } else {
    console.log('❌ Environment validation failed');
    errors.push(...envCheck.errors);
  }

  // Check Redis
  console.log('🔴 Connecting to Redis...');
  const redisCheck = await checkRedis();
  checks.redis = redisCheck.success;
  if (redisCheck.success) {
    console.log('✅ Redis connected');
  } else {
    console.log('❌ Redis connection failed');
    errors.push(...redisCheck.errors);
  }

  // Check MongoDB
  console.log('🍃 Connecting to MongoDB...');
  const mongoCheck = await checkMongoDB();
  checks.mongodb = mongoCheck.success;
  if (mongoCheck.success) {
    console.log('✅ MongoDB connected');
  } else {
    console.log('❌ MongoDB connection failed');
    errors.push(...mongoCheck.errors);
  }

  // Check payment provider
  console.log('💳 Checking Razorpay configuration...');
  const paymentCheck = checkPaymentService();
  checks.payment = paymentCheck.success;
  if (paymentCheck.success) {
    console.log('✅ Razorpay enabled');
  } else {
    console.log('⚠️  Razorpay disabled');
    // Don't add to errors - payment provider is optional
  }

  // Check email service
  console.log('📧 Checking email service...');
  const emailCheck = checkEmailService();
  checks.email = emailCheck.success;
  if (emailCheck.success) {
    console.log('✅ Email service enabled');
  } else {
    console.log('⚠️  Email service disabled');
    // Don't add to errors - email is optional
  }

  // Check OAuth
  console.log('🔐 Checking OAuth configuration...');
  const oauthCheck = checkOAuth();
  checks.oauth = oauthCheck.success;
  if (oauthCheck.success) {
    console.log('✅ OAuth configured');
  } else {
    console.log('⚠️  OAuth not configured');
    // Don't add to errors - OAuth is optional
  }

  console.log('\n' + '='.repeat(50));

  const success = checks.environment && checks.redis && checks.mongodb;

  if (success) {
    console.log('✅ All required services initialized successfully!\n');
  } else {
    console.log('❌ Service initialization failed with critical errors:\n');
    errors.forEach((err) => console.log(`  - ${err}`));
    console.log();
  }

  return {
    success,
    checks,
    errors
  };
};

/**
 * Get initialization status
 */
export const getInitializationStatus = (): {
  mongodb: boolean;
  redis: boolean;
  payment: boolean;
  email: boolean;
  oauth: boolean;
} => {
  return {
    mongodb: mongoose.connection.readyState === 1,
    redis: redisClient.isOpen,
    payment: isRazorpayEnabled(),
    email: isEmailServiceEnabled(),
    oauth: isGoogleOAuthEnabled()
  };
};
