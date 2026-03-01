import { Router } from 'express';
import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    bulkDeleteUsers,
} from '../controllers/users.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All routes require authentication and Administrator role
router.use(authenticate);
router.use(requireRole('ADMINISTRATOR'));

router.get('/', getAllUsers);
router.post('/', validate(createUserSchema), auditMiddleware('CREATE', 'User'), createUser);
router.post('/bulk-delete', auditMiddleware('BULK_DELETE', 'User'), bulkDeleteUsers);
router.put('/:id', validate(updateUserSchema), auditMiddleware('UPDATE', 'User'), updateUser);
router.delete('/:id', auditMiddleware('DELETE', 'User'), deleteUser);

export default router;
