import express from 'express';
import multer from 'multer';

import { validateRequest } from '../../common/middleware/validateRequest';
import { authenticate } from '../../common/middleware/authMiddleware';

import { ChatController } from './chat.controller';
import { chatHistorySchema, chatMessageSchema, chatRoomSchema } from './chat.validation';


const router = express.Router();
const controller = new ChatController();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/room', authenticate, validateRequest(chatRoomSchema), controller.getOrCreateRoom.bind(controller));
router.post('/upload', authenticate, upload.single('file'), controller.uploadAttachment.bind(controller));
router.get('/:roomId/messages', authenticate, validateRequest(chatHistorySchema), controller.getMessages.bind(controller));
router.post('/:roomId/messages', authenticate, validateRequest(chatMessageSchema), controller.sendMessage.bind(controller));

export default router;
