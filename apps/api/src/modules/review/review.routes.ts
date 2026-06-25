import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate, requireRole } from '../../common/middleware/authMiddleware';

import { ReviewController } from './review.controller';
import { listDoctorReviewsSchema, moderateReviewSchema, replyReviewSchema, submitReviewSchema } from './review.validation';

const router = express.Router();
const controller = new ReviewController();

router.post('/appointments/:appointmentId/review', authenticate, requireRole(['patient']), validateRequest(submitReviewSchema), controller.submitReview.bind(controller));
router.get('/doctors/:doctorId/reviews', authenticate, validateRequest(listDoctorReviewsSchema), controller.listDoctorReviews.bind(controller));
router.post('/doctors/reviews/:reviewId/reply', authenticate, requireRole(['doctor']), validateRequest(replyReviewSchema), controller.replyToReview.bind(controller));
router.patch('/admin/reviews/:reviewId/moderate', authenticate, requireRole(['admin']), validateRequest(moderateReviewSchema), controller.moderateReview.bind(controller));

export default router;
