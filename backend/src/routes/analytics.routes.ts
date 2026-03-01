import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { validate } from '../middleware/validate';
import { logEventsSchema } from '../schemas/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public ingestion endpoint
router.post('/log', validate(logEventsSchema), analyticsController.logEvents);

// Protected retrieval endpoints
router.get('/summary', authenticate, analyticsController.getSummary);
router.get('/page-views', authenticate, analyticsController.getPageViews);
router.get('/active-users', authenticate, analyticsController.getActiveUsers);
router.get('/recent', authenticate, analyticsController.getRecentActivity);

export default router;
