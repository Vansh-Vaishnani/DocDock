import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JWTPayload {
  sub: string;
  role: 'patient' | 'doctor' | 'admin';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId: string, role: 'patient' | 'doctor' | 'admin'): string => {
  return jwt.sign(
    { sub: userId, role },
    config.jwtAccessSecret,
    {
      expiresIn: config.accessTokenExpiresIn,
      algorithm: 'HS256'
    } as SignOptions
  );
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId: string, role: 'patient' | 'doctor' | 'admin'): string => {
  return jwt.sign(
    { sub: userId, role },
    config.jwtRefreshSecret,
    {
      expiresIn: config.refreshTokenExpiresIn,
      algorithm: 'HS256'
    } as SignOptions
  );
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, role: 'patient' | 'doctor' | 'admin'): TokenPair => {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId, role)
  };
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwtAccessSecret, {
      algorithms: ['HS256']
    } as VerifyOptions) as JWTPayload;
  } catch (error) {
    const message = error instanceof jwt.JsonWebTokenError ? error.message : 'Token verification failed';
    throw new Error(`Access token verification failed: ${message}`);
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret, {
      algorithms: ['HS256']
    } as VerifyOptions) as JWTPayload;
  } catch (error) {
    const message = error instanceof jwt.JsonWebTokenError ? error.message : 'Token verification failed';
    throw new Error(`Refresh token verification failed: ${message}`);
  }
};

/**
 * Extract token from Authorization header
 */
export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '').trim();
};

/**
 * Decode token without verification (use with caution)
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  return decoded.exp * 1000 < Date.now();
};
