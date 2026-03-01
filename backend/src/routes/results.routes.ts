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
    getStudentTaskStatus,
    resetReconciliation
} from '../controllers/reconciliation.controller';
import {
    submitObstetricianResult
} from '../controllers/obstetrician.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createResultSchema, finalizeReconciliationSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';
import { checkAccessSchedule } from '../middleware/accessSchedule.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dual examiner endpoints
router.get('/pending-reconciliations', getPendingReconciliations);
router.get('/student/:studentId/task-status', getStudentTaskStatus);
router.post('/practical/dual', requireRole('EXAMINER'), checkAccessSchedule, validate(createResultSchema), auditMiddleware('CREATE_DUAL', 'ExamResult'), submitDualPracticalResult);
router.get('/reconciliation/:reconciliationId', getReconciliationData);
router.post('/reconciliation/:reconciliationId/finalize', requireRole('EXAMINER'), checkAccessSchedule, validate(finalizeReconciliationSchema), auditMiddleware('FINALIZE', 'ExamResult'), submitFinalResult);
router.post('/reconciliation/:reconciliationId/finalize-practical', requireRole('EXAMINER'), checkAccessSchedule, validate(finalizeReconciliationSchema), auditMiddleware('FINALIZE', 'ExamResult'), submitPracticalFinalResult);
router.post('/reconciliation/:reconciliationId/reset', requireRole('ADMINISTRATOR'), auditMiddleware('RESET_RECONCILIATION', 'ExamResult'), resetReconciliation);

router.get('/', getAllResults);
router.get('/:id', getResultById);

// Legacy single examiner endpoints
router.post('/practical', requireRole('EXAMINER'), checkAccessSchedule, validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitPracticalResult);
router.post('/care-study', requireRole('EXAMINER'), checkAccessSchedule, validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitCareStudyResult);
router.post('/care-plan', requireRole('EXAMINER'), checkAccessSchedule, validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitCarePlanResult);
router.post('/obstetrician', requireRole('EXAMINER'), checkAccessSchedule, validate(createResultSchema), auditMiddleware('CREATE', 'ExamResult'), submitObstetricianResult);



router.delete('/:id', deleteResult);

export default router;
