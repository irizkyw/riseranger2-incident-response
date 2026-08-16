import { Router } from 'express';
import { register, login, logout, refreshToken, getMe, joinEvent, updateProfile, changePassword, getCaptcha } from '../controllers/authController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { authLimiter } from '../middlewares/rateLimit.ts';
import { validate, registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../middlewares/validator.ts';

const router = Router();

// Public Captcha Endpoint
router.get('/captcha', getCaptcha);

// Protected Auth Endpoints with Anti-Bruteforce Rate Limiting
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);

router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/events/join', authenticate, joinEvent);

export default router;
