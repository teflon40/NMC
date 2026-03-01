import { Router } from 'express';
import { register, login, refreshToken, logout, getMe } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, refreshTokenSchema } from '../schemas/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: 'Too many login attempts, please try again later'
});

// Registration is admin-only — prevents self-registration as ADMINISTRATOR
router.post('/register', authenticate, requireRole('ADMINISTRATOR'), validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
