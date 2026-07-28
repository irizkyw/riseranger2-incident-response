import { Router } from 'express';
import { register, login, refreshToken, getMe, joinEvent } from '../controllers/authController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { validate, registerSchema, loginSchema } from '../middlewares/validator.ts';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getMe);
router.post('/events/join', authenticate, joinEvent);

export default router;
