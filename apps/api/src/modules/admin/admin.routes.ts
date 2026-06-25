import express from 'express';
import { AdminController } from './admin.controller';
import { validateRequest } from '../../common/middleware/validateRequest';
import { verifyDoctorSchema } from './admin.validation';
import { requireRole } from '../../common/middleware/authMiddleware';

const router = express.Router();
const controller = new AdminController();

router.get('/doctors/pending', requireRole(['admin']), controller.listPendingDoctors.bind(controller));
router.post('/doctors/:doctorId/verify', requireRole(['admin']), validateRequest(verifyDoctorSchema), controller.verifyDoctor.bind(controller));

export default router;
