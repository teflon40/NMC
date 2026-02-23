import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller';

const router = Router();

// Public route for health checking
router.get('/', checkHealth);

export default router;
