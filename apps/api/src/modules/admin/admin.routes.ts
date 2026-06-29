import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { AdminController } from './admin.controller';
import {
  appointmentIdParamSchema,
  doctorIdParamSchema,
  listAppointmentsSchema,
  listAuditLogsSchema,
  listDoctorsSchema,
  listReviewsSchema,
  listUsersSchema,
  paymentDashboardSchema,
  reviewIdParamSchema,
  updateSettingsSchema,
  updateUserSchema,
  userIdParamSchema,
  verifyDoctorSchema
} from './admin.validation';

const router = express.Router();
const controller = new AdminController();
const adminOnly = requireRole(['admin']);

router.get('/dashboard', adminOnly, controller.getDashboard.bind(controller));
router.get('/analytics', adminOnly, controller.getAnalytics.bind(controller));

router.get('/doctors/pending', adminOnly, validateRequest(listDoctorsSchema), controller.listPendingDoctors.bind(controller));
router.get('/doctors/:doctorId', adminOnly, validateRequest(doctorIdParamSchema), controller.getDoctorDetail.bind(controller));
router.post('/doctors/:doctorId/verify', adminOnly, validateRequest(verifyDoctorSchema), controller.verifyDoctor.bind(controller));

router.get('/users', adminOnly, validateRequest(listUsersSchema), controller.listUsers.bind(controller));
router.get('/users/:userId', adminOnly, validateRequest(userIdParamSchema), controller.getUser.bind(controller));
router.patch('/users/:userId', adminOnly, validateRequest(updateUserSchema), controller.updateUser.bind(controller));
router.patch('/users/:userId/suspend', adminOnly, validateRequest(userIdParamSchema), controller.suspendUser.bind(controller));
router.patch('/users/:userId/activate', adminOnly, validateRequest(userIdParamSchema), controller.activateUser.bind(controller));
router.delete('/users/:userId', adminOnly, validateRequest(userIdParamSchema), controller.deleteUser.bind(controller));

router.get('/appointments', adminOnly, validateRequest(listAppointmentsSchema), controller.listAppointments.bind(controller));
router.get('/appointments/:appointmentId', adminOnly, validateRequest(appointmentIdParamSchema), controller.getAppointmentDetail.bind(controller));

router.get('/payments', adminOnly, validateRequest(paymentDashboardSchema), controller.getPaymentDashboard.bind(controller));

router.get('/reviews', adminOnly, validateRequest(listReviewsSchema), controller.listReviews.bind(controller));
router.delete('/reviews/:reviewId', adminOnly, validateRequest(reviewIdParamSchema), controller.deleteReview.bind(controller));

router.get('/settings', adminOnly, controller.getSettings.bind(controller));
router.patch('/settings', adminOnly, validateRequest(updateSettingsSchema), controller.updateSettings.bind(controller));

router.get('/audit-logs', adminOnly, validateRequest(listAuditLogsSchema), controller.listAuditLogs.bind(controller));

export default router;
