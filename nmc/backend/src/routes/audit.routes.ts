import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All audit routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('ADMINISTRATOR'));

// Get audit logs
router.get('/logs', auditController.getLogs);

export default router;
