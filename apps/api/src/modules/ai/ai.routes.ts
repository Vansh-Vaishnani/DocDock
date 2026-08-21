import express from 'express';

import { authenticate } from '../../common/middleware/authMiddleware';

import { AIController } from './ai.controller';

const router = express.Router();
const controller = new AIController();

router.post('/symptom-check', authenticate, controller.symptomCheck.bind(controller));
router.post('/recommend-doctors', authenticate, controller.recommendDoctors.bind(controller));
router.post('/chat', authenticate, controller.chat.bind(controller));
router.post('/prescription-summary', authenticate, controller.prescriptionSummary.bind(controller));

export default router;
