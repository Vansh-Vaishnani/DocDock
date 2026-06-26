import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { config } from '../../common/config';
import { ApiError } from '../../common/errors/ApiError';

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
    if (user.role === 'doctor' && user.verificationStatus !== 'approved') {
      throw new ApiError('Doctor account is not verified', 403, 'DOCTOR_NOT_VERIFIED');
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
}
