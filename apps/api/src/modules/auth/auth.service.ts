import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { config } from '../../common/config';
import { ApiError } from '../../common/errors/ApiError';
import { sendPasswordResetEmail, isEmailServiceEnabled } from '../../services/email.service';

import { DoctorModel } from '../doctor/doctor.repository';
import { PatientModel } from '../patient/patient.repository';

import { UserModel, IUserDocument } from './auth.repository';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(payload: { fullName: string; email: string; phone: string; password: string; role: 'patient' | 'doctor' }): Promise<Partial<IUserDocument>> {
    const existingEmail = await UserModel.findOne({ email: payload.email });
    if (existingEmail) {
      throw new ApiError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }
    const existingPhone = await UserModel.findOne({ phone: payload.phone });
    if (existingPhone) {
      throw new ApiError('Phone already registered', 409, 'PHONE_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await UserModel.create({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: payload.role,
      isVerified: false,
      isActive: true,
      isDeleted: false,
      verificationStatus: payload.role === 'doctor' ? 'pending' : undefined
    });

    if (payload.role === 'patient') {
      await PatientModel.create({ userId: user._id });
    } else if (payload.role === 'doctor') {
      await DoctorModel.create({
        userId: user._id,
        licenseNumber: `TEMP-${user._id.toString()}`,
        specialization: 'General',
        qualifications: [],
        experience: 0,
        bio: '',
        languages: [],
        consultationFee: 0,
        location: { type: 'Point', coordinates: [0, 0] },
        availability: { isAvailable: false },
        verificationStatus: 'pending',
        averageRating: 0,
        reviewCount: 0
      });
    }

    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus
    };
  }

  async login(payload: { email: string; password: string }): Promise<{ user: Partial<IUserDocument>; tokens: AuthTokens }> {
    const user = await UserModel.findOne({ email: payload.email, isDeleted: false, isActive: true });
    if (!user) {
      throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    const match = await bcrypt.compare(payload.password, user.passwordHash);
    if (!match) {
      throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    if (user.role === 'doctor' && config.devAutoVerifyDoctor) {
      const doctor = await DoctorModel.findOne({ userId: user._id });
      if (doctor && doctor.verificationStatus !== 'approved') {
        doctor.verificationStatus = 'approved';
        await doctor.save();
      }
      if (user.verificationStatus !== 'approved' || user.isVerified !== true) {
        user.verificationStatus = 'approved';
        user.isVerified = true;
      }
    }

    if (user.role === 'doctor' && user.verificationStatus === 'rejected') {
      throw new ApiError('Doctor account verification was rejected', 403, 'DOCTOR_NOT_VERIFIED');
    }
    const tokens = this.generateTokens(user._id.toString(), user.role);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);
    user.refreshTokenHash = refreshTokenHash;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.role === 'doctor' ? user.verificationStatus === 'approved' : user.isVerified,
        verificationStatus: user.verificationStatus
      },
      tokens
    };
  }

  generateTokens(userId: string, role: 'patient' | 'doctor' | 'admin'): AuthTokens {
    const accessToken = jwt.sign(
      { sub: userId, role },
      config.jwtAccessSecret,
      { expiresIn: config.accessTokenExpiresIn as jwt.SignOptions['expiresIn'] }
    );
    const refreshToken = jwt.sign(
      { sub: userId, role },
      config.jwtRefreshSecret,
      { expiresIn: config.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'] }
    );
    return { accessToken, refreshToken };
  }

  async handleGoogleLogin(profile: { googleId: string; email: string; fullName: string; avatar?: string }): Promise<{ user: Partial<IUserDocument>; tokens: AuthTokens }> {
    const email = profile.email.toLowerCase();
    let user = await UserModel.findOne({ email, isDeleted: false });

    if (!user) {
      const passwordHash = await bcrypt.hash(`google-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, 12);
      const phone = `google-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      user = await UserModel.create({
        fullName: profile.fullName || email,
        email,
        phone,
        passwordHash,
        role: 'patient',
        isVerified: true,
        isActive: true,
        isDeleted: false,
        googleId: profile.googleId,
        avatar: profile.avatar,
        verificationStatus: undefined
      });
      await PatientModel.create({ userId: user._id });
    } else {
      user.googleId = user.googleId || profile.googleId;
      user.avatar = user.avatar || profile.avatar;
      user.fullName = user.fullName || profile.fullName || email;
      user.isVerified = true;
      await user.save();
    }

    const tokens = this.generateTokens(user._id.toString(), user.role);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);
    user.refreshTokenHash = refreshTokenHash;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      tokens
    };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    let payload: { sub: string; role: 'patient' | 'doctor' | 'admin' };
    try {
      payload = jwt.verify(token, config.jwtRefreshSecret) as { sub: string; role: 'patient' | 'doctor' | 'admin' };
    } catch {
      throw new ApiError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    const user = await UserModel.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new ApiError('Refresh token not found', 401, 'REFRESH_TOKEN_NOT_FOUND');
    }
    const validToken = await bcrypt.compare(token, user.refreshTokenHash);
    if (!validToken) {
      throw new ApiError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    const tokens = this.generateTokens(user._id.toString(), user.role);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);
    await user.save();
    return tokens;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false, isActive: true });
    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = await bcrypt.hash(resetToken, 12);
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    if (isEmailServiceEnabled()) {
      await sendPasswordResetEmail(user.email, resetToken, user.fullName);
    } else {
      console.warn(`Password reset link (email not configured): ${config.appUrl.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(resetToken)}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const users = await UserModel.find({
      passwordResetExpiry: { $gt: new Date() },
      passwordResetToken: { $exists: true, $ne: null }
    });

    let matchedUser: IUserDocument | null = null;
    for (const user of users) {
      if (user.passwordResetToken && (await bcrypt.compare(token, user.passwordResetToken))) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new ApiError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    matchedUser.passwordHash = await bcrypt.hash(newPassword, 12);
    matchedUser.passwordResetToken = undefined;
    matchedUser.passwordResetExpiry = undefined;
    matchedUser.refreshTokenHash = undefined;
    await matchedUser.save();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user || user.isDeleted || !user.isActive) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw new ApiError('Current password is incorrect', 400, 'INVALID_CREDENTIALS');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.refreshTokenHash = undefined;
    await user.save();
  }
}
