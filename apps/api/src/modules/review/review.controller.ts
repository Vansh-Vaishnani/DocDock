import { NextFunction, Request, Response } from 'express';

import { ApiError } from '../../common/errors/ApiError';
import { AuthenticatedRequest } from '../../common/middleware/authMiddleware';
import { sendCreated, sendSuccess } from '../../common/utils/http';

import { ReviewService } from './review.service';

const reviewService = new ReviewService();

export class ReviewController {
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }

      const review = await reviewService.submitReview(user.sub, req.params.appointmentId, req.body.rating, req.body.comment);
      sendCreated(res, review, 'Review submitted. Thank you for your feedback.');
    } catch (error) {
      next(error);
    }
  }

  async listDoctorReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
      const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'createdAt';
      const order = typeof req.query.order === 'string' ? req.query.order : 'desc';
      const result = await reviewService.listDoctorReviews(req.params.doctorId, page, limit, sort, order as 'asc' | 'desc');
      sendSuccess(res, result, 'Doctor reviews fetched');
    } catch (error) {
      next(error);
    }
  }

  async replyToReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user) {
        next(new ApiError('Authentication required', 401, 'AUTH_REQUIRED'));
        return;
      }

      const review = await reviewService.replyToReview(user.sub, req.params.reviewId, req.body.reply);
      sendSuccess(res, review, 'Review reply submitted.');
    } catch (error) {
      next(error);
    }
  }

  async moderateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.moderateReview(req.params.reviewId, (req as AuthenticatedRequest).body?.isHidden);
      sendSuccess(res, review, 'Review moderation updated.');
    } catch (error) {
      next(error);
    }
  }
}
