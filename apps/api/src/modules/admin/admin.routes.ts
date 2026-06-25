import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { requireRole } from '../../common/middleware/authMiddleware';

import { AdminController } from './admin.controller';
import { verifyDoctorSchema } from './admin.validation';


const router = express.Router();
const controller = new AdminController();

router.get('/doctors/pending', requireRole(['admin']), controller.listPendingDoctors.bind(controller));
router.post('/doctors/:doctorId/verify', requireRole(['admin']), validateRequest(verifyDoctorSchema), controller.verifyDoctor.bind(controller));
router.get('/dashboard', requireRole(['admin']), controller.getDashboard.bind(controller));
router.get('/analytics', requireRole(['admin']), controller.getAnalytics.bind(controller));

export default router;
