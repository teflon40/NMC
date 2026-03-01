import { Router } from 'express';
import {
    getAllPrograms,
    createProgram,
    updateProgram,
    deleteProgram,
} from '../controllers/programs.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProgramSchema, updateProgramSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllPrograms);
router.post('/', requireRole('ADMINISTRATOR'), validate(createProgramSchema), auditMiddleware('CREATE', 'Program'), createProgram);
router.put('/:id', requireRole('ADMINISTRATOR'), validate(updateProgramSchema), auditMiddleware('UPDATE', 'Program'), updateProgram);
router.delete('/:id', requireRole('ADMINISTRATOR'), auditMiddleware('DELETE', 'Program'), deleteProgram);

export default router;
