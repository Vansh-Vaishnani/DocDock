/**
 * Structured JSON logger for DocDock API.
 *
 * Sanitizes sensitive fields and emits JSON lines suitable for log aggregation
 * (e.g. Datadog, CloudWatch, Loki). Does not log passwords, tokens, payment
 * secrets, or sensitive medical information.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** Fields that must never appear in structured logs */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'jwtSecret',
  'razorpayKeySecret',
  'razorpaySignature',
  'webhookSecret',
  'apiKey',
  'sendgridApiKey',
  'twilioAuthToken',
  'googleClientSecret',
  'otp',
  'otpHash',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'medicalNotes',
  'privateKey',
  'cookieSecret',
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[MaxDepth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitize(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitize(value, depth + 1);
    }
  }
  return result;
}

export interface LogContext {
  eventId?: string;
  appointmentId?: string;
  userId?: string;
  paymentId?: string;
  eventType?: string;
  jobId?: string;
  queue?: string;
  topic?: string;
  partition?: number;
  offset?: string;
  durationMs?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'docdock-api',
    message,
    ...(context ? (sanitize(context) as object) : {}),
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production') {
      emit('debug', message, context);
    }
  },
};
