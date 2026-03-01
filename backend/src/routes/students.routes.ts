import { Router } from 'express';
import {
    getAllStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkCreateStudents,
    bulkDeleteStudents,
    promoteStudents,
    getStudentTaskCompletion,
} from '../controllers/students.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStudentSchema, updateStudentSchema, bulkStudentsSchema, promoteStudentsSchema } from '../schemas/validation';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllStudents);
router.get('/:id', getStudentById);
router.post('/', requireRole('ADMINISTRATOR'), validate(createStudentSchema), auditMiddleware('CREATE', 'Student'), createStudent);
router.put('/:id', requireRole('ADMINISTRATOR'), validate(updateStudentSchema), auditMiddleware('UPDATE', 'Student'), updateStudent);
router.delete('/:id', requireRole('ADMINISTRATOR'), auditMiddleware('DELETE', 'Student'), deleteStudent);
router.post('/bulk', requireRole('ADMINISTRATOR'), validate(bulkStudentsSchema), bulkCreateStudents);
router.post('/bulk-delete', requireRole('ADMINISTRATOR'), auditMiddleware('BULK_DELETE', 'Student'), bulkDeleteStudents);
router.post('/promote', requireRole('ADMINISTRATOR'), validate(promoteStudentsSchema), promoteStudents);
router.get('/:studentId/task-completion', getStudentTaskCompletion);

export default router;
