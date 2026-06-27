import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import { getGoogleOAuthConfig, extractProfileFromGoogle } from '../../common/config/oauth';
import { config } from '../../common/config';
import { validateRequest } from '../../common/middleware/validateRequest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';

const router = express.Router();
const controller = new AuthController();
const authService = new AuthService();

router.use(passport.initialize());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: getGoogleOAuthConfig()?.callbackURL || `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/v1/auth/google/callback`
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const googleProfile = extractProfileFromGoogle(profile as never);
    const result = await authService.handleGoogleLogin(googleProfile);
    return done(null, result);
  } catch (error) {
    return done(error as Error);
  }
}));

router.get('/google', (req, res, next) => {
  const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : undefined;
  const state = redirect ? encodeURIComponent(redirect) : undefined;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, async (error: unknown, authResult: { user: unknown; tokens: { accessToken: string; refreshToken: string } } | undefined) => {
    if (error || !authResult) {
      const fallback = `${config.appUrl}/auth/login?error=google_auth_failed`;
      res.redirect(fallback);
      return;
    }

    const redirectTarget = typeof req.query.state === 'string' ? decodeURIComponent(req.query.state) : `${config.appUrl}/auth/google/callback`;
    const redirectUrl = new URL(redirectTarget, config.appUrl);
    redirectUrl.searchParams.set('accessToken', authResult.tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', authResult.tokens.refreshToken);
    redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(authResult.user)));
    res.redirect(redirectUrl.toString());
  })(req, res, next);
});

router.post('/register', validateRequest(registerSchema), controller.register.bind(controller));
router.post('/login', validateRequest(loginSchema), controller.login.bind(controller));
router.post('/refresh-token', validateRequest(refreshSchema), controller.refreshToken.bind(controller));

export default router;
