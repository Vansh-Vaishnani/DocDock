import { Request } from 'express';

import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { UserModel } from '../auth/auth.repository';

import { AuditLogModel } from './admin.repository';

const getClientIp = (req: Request): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  return req.socket?.remoteAddress;
};

export async function logAdminAction(
  req: Request,
  action: string,
  target: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const user = (req as AuthenticatedRequest).user;
  if (!user) return;

  const admin = await UserModel.findById(user.sub).select('fullName').lean();
  if (!admin) return;

  await AuditLogModel.create({
    adminId: user.sub,
    adminName: admin.fullName,
    action,
    target,
    targetId,
    metadata,
    ip: getClientIp(req)
  });
}
