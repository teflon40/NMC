import { Router } from 'express';
import {
    getAllResults,
    getResultById,
    submitCareStudyResult,
    submitCarePlanResult,
    deleteResult
} from '../controllers/results.controller';
import {
    submitPracticalResult,
    submitDualPracticalResult,
    submitPracticalFinalResult
} from '../controllers/practical.controller';
import {
    getReconciliationData,
    submitFinalResult,
    getPendingReconciliations,
    getStudentTaskStatus
} from '../controllers/reconciliation.controller';
import {
    submitObstetricianResult,
    submitObstetricianFinalResult
} from '../controllers/obstetrician.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createResultSchema, finalizeReconciliationSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dual examiner endpoints
router.get('/pending-reconciliations', getPendingReconciliations);
router.get('/student/:studentId/task-status', getStudentTaskStatus);
router.post('/practical/dual', requireRole('EXAMINER'), validate(createResultSchema), auditMiddleware('CREATE_DUAL', 'ExamResult'), submitDualPracticalResult);
router.get('/reconciliation/:reconciliationId', getReconciliationData);
router.post('/reconciliation/:reconciliationId/finalize', requireRole('EXAMINER'), validate(finalizeReconciliationSchema), auditMiddleware('FINALIZE', 'ExamResult'), submitFinalResult);
router.post('/reconciliation/:reconciliationId/finalize-practical', requireRole('EXAMINER'), validate(finalizeReconciliationSchema), auditMiddleware('FINALIZE', 'ExamResult'), submitPracticalFinalResult);

router.get('/', getAllResults);
router.get('/:id', getResultById);

// Legacy single examiner endpoints
router.post('/practical', requireRole('EXAMINER'), validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitPracticalResult);
router.post('/care-study', requireRole('EXAMINER'), validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitCareStudyResult);
router.post('/care-plan', requireRole('EXAMINER'), validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitCarePlanResult);
router.post('/obstetrician', requireRole('EXAMINER'), validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitObstetricianResult);

// Obstetrician reconciliation endpoints
router.get('/obstetrician/reconciliation/:reconciliationId', getReconciliationData);
router.post('/obstetrician/reconciliation/:reconciliationId/finalize', requireRole('EXAMINER'), validate(finalizeReconciliationSchema), submitObstetricianFinalResult);

router.delete('/:id', deleteResult);

export default router;
