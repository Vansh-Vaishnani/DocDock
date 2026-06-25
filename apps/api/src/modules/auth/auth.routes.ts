import express from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../common/middleware/validateRequest';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';

const router = express.Router();
const controller = new AuthController();

router.post('/register', validateRequest(registerSchema), controller.register.bind(controller));
router.post('/login', validateRequest(loginSchema), controller.login.bind(controller));
router.post('/refresh-token', validateRequest(refreshSchema), controller.refreshToken.bind(controller));

export default router;
