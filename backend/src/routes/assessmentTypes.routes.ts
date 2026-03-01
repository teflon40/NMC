import { Router } from 'express';
import {
    getAllAssessmentTypes,
    createAssessmentType,
    updateAssessmentType,
    deleteAssessmentType,
} from '../controllers/assessmentTypes.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAssessmentTypeSchema, updateAssessmentTypeSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public read-access (examiners need this to know what they can assess)
router.get('/', getAllAssessmentTypes);

// Admin-only mutations
router.post('/', requireRole('ADMINISTRATOR'), validate(createAssessmentTypeSchema), auditMiddleware('CREATE', 'AssessmentType'), createAssessmentType);
router.put('/:id', requireRole('ADMINISTRATOR'), validate(updateAssessmentTypeSchema), auditMiddleware('UPDATE', 'AssessmentType'), updateAssessmentType);
router.delete('/:id', requireRole('ADMINISTRATOR'), auditMiddleware('DELETE', 'AssessmentType'), deleteAssessmentType);

export default router;
