import { config } from './index';

export interface GoogleOAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  name?: {
    familyName: string;
    givenName: string;
  };
  emails?: Array<{
    value: string;
    verified: boolean;
  }>;
  photos?: Array<{
    value: string;
  }>;
  provider: 'google';
}

/**
 * Get Google OAuth configuration
 * Returns null if OAuth credentials are not configured
 */
export const getGoogleOAuthConfig = (): GoogleOAuthConfig | null => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    return null;
  }

  return {
    clientID,
    clientSecret,
    callbackURL: `${config.apiUrl}/auth/google/callback`
  };
};

/**
 * Check if Google OAuth is enabled
 */
export const isGoogleOAuthEnabled = (): boolean => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

/**
 * Extract relevant profile information from Google profile
 */
export const extractProfileFromGoogle = (profile: GoogleProfile): {
  googleId: string;
  email: string;
  fullName: string;
  avatar?: string;
} => {
  const email = profile.emails?.[0]?.value || '';
  const fullName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
  const avatar = profile.photos?.[0]?.value;

  return {
    googleId: profile.id,
    email,
    fullName,
    avatar
  };
};
