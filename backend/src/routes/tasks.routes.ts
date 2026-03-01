import { Router } from 'express';
import {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    bulkDeleteTasks,
    bulkImportTasks
} from '../controllers/tasks.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema } from '../schemas/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', requireRole('ADMINISTRATOR'), validate(createTaskSchema), auditMiddleware('CREATE', 'Task'), createTask);
router.post('/bulk-import', requireRole('ADMINISTRATOR'), auditMiddleware('BULK_IMPORT', 'Task'), bulkImportTasks);
router.post('/bulk-delete', requireRole('ADMINISTRATOR'), auditMiddleware('BULK_DELETE', 'Task'), bulkDeleteTasks);
router.put('/:id', requireRole('ADMINISTRATOR'), validate(updateTaskSchema), auditMiddleware('UPDATE', 'Task'), updateTask);
router.delete('/:id', requireRole('ADMINISTRATOR'), auditMiddleware('DELETE', 'Task'), deleteTask);

export default router;
