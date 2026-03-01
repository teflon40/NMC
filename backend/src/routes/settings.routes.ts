import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema, updateSystemSettingsSchema, factoryResetSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', settingsController.getProfile);
router.put('/profile', validate(updateProfileSchema), auditMiddleware('UPDATE_PROFILE', 'User'), settingsController.updateProfile);

// Password route
router.post('/password', validate(changePasswordSchema), auditMiddleware('CHANGE_PASSWORD', 'User'), settingsController.changePassword);

// System settings routes (Admin only for update, Public/Auth for get)
router.get('/system', settingsController.getSystemSettings);
router.get('/access-schedule', settingsController.getAccessSchedule);

router.put('/system', requireRole('ADMINISTRATOR'), validate(updateSystemSettingsSchema), auditMiddleware('UPDATE', 'SystemSetting'), settingsController.updateSystemSettings);

// Factory Reset Danger Zone
router.post('/factory-reset', requireRole('ADMINISTRATOR'), validate(factoryResetSchema), auditMiddleware('FACTORY_RESET', 'System'), settingsController.factoryReset);

export default router;
