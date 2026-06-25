import express from 'express';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate } from '../../common/middleware/authMiddleware';

import { NotificationController } from './notification.controller';
import { notificationIdSchema } from './notification.validation';


const router = express.Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.list.bind(controller));
router.patch('/:notificationId/read', authenticate, validateRequest(notificationIdSchema), controller.markAsRead.bind(controller));
router.patch('/read-all', authenticate, controller.markAllAsRead.bind(controller));

export default router;
